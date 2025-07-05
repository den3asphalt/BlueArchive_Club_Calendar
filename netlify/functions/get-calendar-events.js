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
    const fs = require('fs/promises');
    const path = require('path');

    // Netlify Functionsが実行される環境で、recruitment_info.jsonへの正しいパスを構築
    const filePath = path.resolve(process.env.LAMBDA_TASK_ROOT, '..', '..', 'recruitment_info.json');

    const rawData = await fs.readFile(filePath, 'utf8');
    const recruitmentData = JSON.parse(rawData);

    // recruitment_info.json がFullCalendarが期待する形式（id, title, start, endなど）で書かれていることを前提とします。
    // そのため、ここでは特別な変換は行わず、そのまま返します。

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // あなたのサイトのURLに合わせる（例: https://bluearchive-club-calendar.netlify.app）
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app' 
      },
      body: JSON.stringify(recruitmentData) // JSONファイルから読み込んだデータをそのまま返す
    };

  } catch (error) {
    console.error("Error fetching recruitment info from JSON file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to load recruitment info." }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app'
      }
    };
  }
};

// parseDescription関数は、もしdescription内にJSON形式のデータを含める場合に必要です。
// 今回のrecruitment_info.jsonの例では、extendedPropsに直接情報を入れているため、
// descriptionをJSONパースする必要がなければ、この関数は削除しても構いません。
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
