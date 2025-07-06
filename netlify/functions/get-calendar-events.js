// netlify/functions/get-calendar-events.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
      headers: { 'Allow': 'GET' }
    };
  }

  try {
    const DATOCMS_API_TOKEN = process.env.DATOCMS_READONLY_API_TOKEN;
    const DATOCMS_API_URL = 'https://graphql.datocms.com/';

    // ★★★ ここが最終修正点！YOUR_LINK_FIELD_API_ID を「club」に置き換えました ★★★
    const query = `
      query AllRecruitmentInfos {
        allRecruitmentInfos {
          id
          club {
            clubName
          }
          startDateTime
          endDateTime
          category
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
        'Accept': 'application/json',
        'Authorization': `Bearer ${DATOCMS_API_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`DatoCMS API error: ${response.status} ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    if (jsonResponse.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(jsonResponse.errors)}`);
    }

    const datoEvents = jsonResponse.data.allRecruitmentInfos;

    const calendarEvents = [];
    const alwaysOpenRecruitment = [];

    datoEvents.forEach(item => {
        // ★★★ ここも最終修正点！item.YOUR_LINK_FIELD_API_ID を「item.club」に置き換えました ★★★
        const circleNameFromLinkedClub = item.club ? item.club.clubName : "サークル名不明";

        const formattedItem = {
            id: item.id,
            title: circleNameFromLinkedClub,
            start: item.startDateTime, 
            end: item.endDateTime,
            extendedProps: { 
                circleName: circleNameFromLinkedClub,
                category: item.category,
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
            } else {
                console.warn(`Event ${item.id || item.clubName} has '期間公募' type but no startDateTime. It will not be shown on calendar.`);
            }
        }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app',
      },
      body: JSON.stringify({
          calendarEvents: calendarEvents,
          alwaysOpenRecruitment: alwaysOpenRecruitment
      }),
    };

  } catch (error) {
    console.error("Error fetching data from DatoCMS or processing:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to load recruitment info." }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app',
      }
    };
  }
};

function parseDescription(description) {
    try {
        const jsonPartMatch = description.match(/\{[\s\S]*\}/s); 
        if (jsonPartMatch) {
            return JSON.parse(jsonPartMatch[0]);
        }
    } catch (e) {
        console.warn("Failed to parse description as JSON:", e);
    }
    return {}; 
}
