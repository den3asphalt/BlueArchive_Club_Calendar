// =======================================================================
// js/circle-page.js (サークル詳細ページ用)
// =======================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('circle-detail-container');
    const params = new URLSearchParams(window.location.search);
    const circleId = params.get('id');

    if (!circleId) {
        container.innerHTML = '<h1>エラー</h1><p>サークルIDが指定されていません。</p>';
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/get-circle-detail?id=${circleId}`);
        if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status}`);
        }
        const data = await response.json();

        if (data.error || !data.club) {
            throw new Error(data.error || '指定されたサークルは見つかりませんでした。');
        }
        
        const circle = data.club;

        document.title = `${circle.clubName} - サークル詳細`;

        // カテゴリ表示のコードを削除
        container.innerHTML = `
            <h1>${circle.clubName}</h1>
            <div class="circle-info">
                <p><strong>リーダーTwitter:</strong> 
                    ${circle.leaderTwitter ? `<a href="${circle.leaderTwitter}" target="_blank" rel="noopener noreferrer">${circle.leaderTwitter}</a>` : '未設定'}
                </p>
                <div class="memo-section">
                    <h2>メモ</h2>
                    <div class="memo-content">
                        ${circle.memo ? marked.parse(circle.memo) : '<p>メモはありません。</p>'}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Failed to load circle details:', error);
        container.innerHTML = `<h1>エラー</h1><p>情報の読み込みに失敗しました。<br>${error.message}</p>`;
    }
});
