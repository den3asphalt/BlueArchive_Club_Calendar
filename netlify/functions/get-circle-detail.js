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

        // 特定のIDを持つclubの情報を取得するクエリから category を削除
        const query = `
          query GetClubDetail($id: ItemId!) {
            club(filter: {id: {eq: $id}}) {
              id
              clubName
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
