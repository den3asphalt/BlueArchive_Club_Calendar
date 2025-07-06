// netlify/functions/get-calendar-events.js

// ★★★ この行を変更します ★★★
// ファイルシステムモジュール（fs）やパスモジュール（path）は不要になりますが、
// 以下のようにJSONファイルを直接 require します。
const recruitmentData = require('./recruitment_info.json'); 

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
      headers: { 'Allow': 'GET' }
    };
  }

  try {

    // ... (ID生成ロジックはそのまま) ...
    const formattedEventsForFullCalendar = recruitmentData.map((item, index) => {
        // ID生成ロジック（変更なし）
        const generatedId = item.id || `generated-${(item.extendedProps?.circleName || item.title || 'untitled').replace(/\s/g, '-')}-${(item.start || 'no-start').replace(/[^a-zA-Z0-9]/g, '')}-${index}`;

        return {
            id: generatedId,
            title: item.extendedProps?.circleName || item.title || "サークル名不明", 
            start: item.start,
            end: item.end,
            description: item.description, 
            location: item.location,
            extendedProps: item.extendedProps 
        };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app' 
      },
      body: JSON.stringify(formattedEventsForFullCalendar)
    };

  } catch (error) {
    console.error("Error fetching recruitment info from JSON file:", error); // エラーメッセージは変わる
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to load events." }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app'
      }
    };
  }
};

// parseDescription関数はそのまま
function parseDescription(description) { /* ... */ return {}; }
