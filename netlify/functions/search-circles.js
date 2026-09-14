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

        // Step 1: サークル名で検索
        const searchQuery = `
          query SearchClubs($filter: ClubClubNameFilter) {
            allClubs(filter: { clubName: { contains: $filter } }, first: 20) {
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
            body: JSON.stringify({
                query: searchQuery,
                variables: { filter: searchTerm.trim() }
            }),
        });

        if (!searchResponse.ok) {
            throw new Error(`DatoCMS API error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        if (searchData.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(searchData.errors)}`);
        }

        const clubs = searchData.data.allClubs;

        if (!clubs || clubs.length === 0) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clubs: [], recruitmentHistory: [] }),
            };
        }

        // Step 2: 一致したサークルのすべての公募履歴を取得
        const clubIds = clubs.map(c => c.id);
        const placeholders = clubIds.map(() => '?').join(',');
        const clubIdStrings = clubIds.map(id => `'${id}'`).join(',');

        const historyQuery = `
          query GetRecruitmentHistory {
            allRecruitmentInfos(
              filter: { club: { id: { in: [${clubIdStrings}] } } }
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
            body: JSON.stringify({ query: historyQuery }),
        });

        if (!historyResponse.ok) {
            throw new Error(`DatoCMS API error: ${historyResponse.status}`);
        }

        const historyData = await historyResponse.json();
        if (historyData.errors) {
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
