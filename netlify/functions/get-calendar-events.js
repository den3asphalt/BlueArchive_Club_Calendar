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

        // GraphQLクエリからcategoryを削除
        const query = `
          query AllRecruitmentInfos {
            allRecruitmentInfos(orderBy: startDateTime_ASC) {
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
            if (!item.club) return;

            // formattedItemからcategoryを削除
            const formattedItem = {
                id: item.id,
                title: item.club.clubName,
                start: item.startDateTime, 
                end: item.endDateTime,
                extendedProps: { 
                    clubId: item.club.clubId,
                    circleName: item.club.clubName,
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
