// =======================================================================
// netlify/functions/get-calendar-events.js (既存Functionの修正版)
// =======================================================================
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const DATOCMS_API_TOKEN = process.env.DATOCMS_READONLY_API_TOKEN;
        const DATOCMS_API_URL = 'https://graphql.datocms.com/';

        // clubのIDも取得するようにクエリを修正
        const query = `
          query AllRecruitmentInfos {
            allRecruitmentInfos(orderBy: startDateTime_ASC) {
              id
              club {
                id
                clubName
                category
              }
              startDateTime
              endDateTime
              tweetUrl
              relatedInfo
              recruitmentType
            }
          }
        `;

        const response = await fetch(DATOCMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DATOCMS_API_TOKEN}`,
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`DatoCMS API error: ${response.status}`);
        }

        const jsonResponse = await response.json();
        if (jsonResponse.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(jsonResponse.errors)}`);
        }

        const datoEvents = jsonResponse.data.allRecruitmentInfos;
        const calendarEvents = [];
        const alwaysOpenRecruitment = [];

        datoEvents.forEach(item => {
            // clubが存在しないデータはスキップ
            if (!item.club) return;

            const formattedItem = {
                id: item.id,
                title: item.club.clubName,
                start: item.startDateTime, 
                end: item.endDateTime,
                extendedProps: { 
                    clubId: item.club.id, // ★サークル詳細ページ用にIDを追加
                    circleName: item.club.clubName,
                    category: item.club.category,
                    tweetUrl: item.tweetUrl,
                    relatedInfo: item.relatedInfo,
                    recruitmentType: item.recruitmentType,
                }
            };

            if (item.recruitmentType === '常時公募') {
                alwaysOpenRecruitment.push(formattedItem);
            } else {
                if (item.startDateTime) { 
                    calendarEvents.push(formattedItem);
                }
            }
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                calendarEvents,
                alwaysOpenRecruitment
            }),
        };

    } catch (error) {
        console.error("Error in get-calendar-events:", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};


// =======================================================================
// netlify/functions/get-circle-detail.js (新規作成)
// =======================================================================
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const circleId = event.queryStringParameters.id;
    if (!circleId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Circle ID is required' })
        };
    }

    try {
        const DATOCMS_API_TOKEN = process.env.DATOCMS_READONLY_API_TOKEN;
        const DATOCMS_API_URL = 'https://graphql.datocms.com/';

        // 特定のIDを持つclubの情報を取得するクエリ
        // 【要確認】DatoCMSのclubモデルに leaderTwitter と memo フィールドが必要です
        const query = `
          query GetClubDetail($id: ItemId!) {
            club(filter: {id: {eq: $id}}) {
              id
              clubName
              category
              leaderTwitter
              memo
            }
          }
        `;

        const variables = { id: circleId };

        const response = await fetch(DATOCMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DATOCMS_API_TOKEN}`,
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`DatoCMS API error: ${response.status}`);
        }

        const jsonResponse = await response.json();
        if (jsonResponse.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(jsonResponse.errors)}`);
        }
        
        if (!jsonResponse.data.club) {
             return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Club not found' }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ club: jsonResponse.data.club }),
        };

    } catch (error) {
        console.error("Error in get-circle-detail:", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
