// =======================================================================
// netlify/functions/search-circles.js (サークル検索＋公募履歴一覧)
// =======================================================================
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const searchTerm = event.queryStringParameters.q;
    if (!searchTerm || searchTerm.trim() === '') {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: '検索語が必要です' })
        };
    }

    try {
        const DATOCMS_API_TOKEN = process.env.DATOCMS_READONLY_API_TOKEN;
        const DATOCMS_API_URL = 'https://graphql.datocms.com/';

        // Step 1: 全サークルを取得（フィルタなし）
        const searchQuery = `
          query SearchClubs {
            allClubs(first: 100) {
              id
              clubName
              leaderTwitter
              description
            }
          }
        `;

        const searchResponse = await fetch(DATOCMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DATOCMS_API_TOKEN}`,
            },
            body: JSON.stringify({ query: searchQuery }),
        });

        if (!searchResponse.ok) {
            const errBody = await searchResponse.text();
            console.error("Search response error body:", errBody);
            throw new Error(`DatoCMS API error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        if (searchData.errors) {
            console.error("Search GraphQL errors:", JSON.stringify(searchData.errors));
            throw new Error(`GraphQL error: ${JSON.stringify(searchData.errors)}`);
        }

        // サーバーサイドでサークル名をフィルタ
        const allClubs = searchData.data.allClubs;
        const clubs = allClubs.filter(club =>
            club.clubName && club.clubName.toLowerCase().includes(searchTerm.trim().toLowerCase())
        );

        if (!clubs || clubs.length === 0) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clubs: [], recruitmentHistory: [] }),
            };
        }

        // Step 2: 一致したサークルのすべての公募履歴を取得
        const clubIds = clubs.map(c => c.id);

        const historyQuery = `
          query GetRecruitmentHistory($clubIds: [ItemId!]!) {
            allRecruitmentInfos(
              filter: { club: { id: { in: $clubIds } } }
              orderBy: startDateTime_DESC
              first: 500
            ) {
              id
              club {
                id
                clubName
              }
              startDateTime
              endDateTime
              tweetUrl
              relatedInfo
              recruitmentType
            }
          }
        `;

        const historyResponse = await fetch(DATOCMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DATOCMS_API_TOKEN}`,
            },
            body: JSON.stringify({
                query: historyQuery,
                variables: { clubIds }
            }),
        });

        if (!historyResponse.ok) {
            const errBody = await historyResponse.text();
            console.error("History response error body:", errBody);
            throw new Error(`DatoCMS API error: ${historyResponse.status}`);
        }

        const historyData = await historyResponse.json();
        if (historyData.errors) {
            console.error("History GraphQL errors:", JSON.stringify(historyData.errors));
            throw new Error(`GraphQL error: ${JSON.stringify(historyData.errors)}`);
        }

        const recruitmentHistory = historyData.data.allRecruitmentInfos || [];

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clubs,
                recruitmentHistory
            }),
        };

    } catch (error) {
        console.error("Error in search-circles:", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
