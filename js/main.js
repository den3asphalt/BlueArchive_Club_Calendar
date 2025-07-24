document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');

    function displayEventModal(eventData) {
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalCircleName = document.getElementById('modalCircleName');
        const modalDuration = document.getElementById('modalDuration');
        const modalRelatedInfo = document.getElementById('modalRelatedInfo');
        const modalTweetEmbed = document.getElementById('modalTweetEmbed');
        const modalTweetLink = document.getElementById('modalTweetLink');
        
        const props = eventData.extendedProps;

        modalTitle.textContent = eventData.title;
        modalCircleName.textContent = props.circleName || '不明';
        modalRelatedInfo.innerHTML = props.relatedInfo ? marked.parse(props.relatedInfo) : 'なし';
        
        let durationText = '';
        if (eventData.start && eventData.end) {
            if (eventData.start.toDateString() !== eventData.end.toDateString()) {
                durationText = `${eventData.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${eventData.end.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
            } else { 
                durationText = `${eventData.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} ${eventData.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                if (eventData.end && eventData.start.getTime() !== eventData.end.getTime()) {
                    durationText += ` - ${eventData.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                }
            }
        } else if (eventData.start) {
            durationText = eventData.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
            if (eventData.allDay) {
                 durationText += ' (終日)';
            }
        }
        
        const durationParagraph = modalDuration.closest('p');
        if (durationText && durationText !== '未設定') {
            modalDuration.textContent = durationText;
            durationParagraph.style.display = 'block';
        } else {
            durationParagraph.style.display = 'none';
        }

        const modalLocationElement = document.getElementById('modalLocation'); 
        if (modalLocationElement) {
            const locationParagraph = modalLocationElement.closest('p'); 
            if (props.location) { 
                modalLocationElement.textContent = props.location;
                locationParagraph.style.display = 'block';
            } else {
                locationParagraph.style.display = 'none';
            }
        }
        
        modalTweetEmbed.innerHTML = ''; 
        modalTweetLink.innerHTML = '';  

        if (props.tweetUrl) {
            const tweetIdMatch = props.tweetUrl.match(/\/status\/(\d+)/);
            if (tweetIdMatch && window.twttr && window.twttr.widgets) {
                const loadingMessageElement = document.createElement('p');
                loadingMessageElement.style.textAlign = 'center';
                loadingMessageElement.textContent = 'Twitterコンテンツを読み込み中...';
                modalTweetEmbed.appendChild(loadingMessageElement); 

                window.twttr.widgets.createTweet(
                    tweetIdMatch[1], 
                    modalTweetEmbed, 
                    { theme: 'light', conversation: 'none', cards: 'hidden', width: '450' }
                ).then(function (el) {
                    if (loadingMessageElement && loadingMessageElement.parentNode) {
                        loadingMessageElement.remove(); 
                    }
                    if (!el) { 
                        modalTweetEmbed.innerHTML = '<p style="color:red; text-align: center;">指定されたツイートは存在しないか、非公開です。<br>または、ブラウザの拡張機能（広告ブロッカー等）によってコンテンツがブロックされている可能性があります。</p>';
                    }
                }).catch(function (error) {
                    if (loadingMessageElement && loadingMessageElement.parentNode) {
                        loadingMessageElement.remove();
                    }
                    console.error('Twitterコンテンツ埋め込みエラー:', error);
                    modalTweetEmbed.innerHTML = '<p style="color:red; text-align: center;">Twitterコンテンツの読み込み中にエラーが発生しました。<br>ネットワーク接続やブラウザの拡張機能をご確認ください。</p>';
                });
            } else {
                modalTweetLink.innerHTML = `<p>ツイートURL: <a href="${props.tweetUrl}" target="_blank">${props.tweetUrl}</a></p>`;
            }
        } else {
            modalTweetEmbed.innerHTML = '<p style="text-align: center; color: #666;">公募ツイートのURLが提供されていません。</p>';
        }

        modal.style.display = 'block';
    }


    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ja',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: '今日',
            month: '月',
            week: '週',
            day: '日'
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        slotLabelFormat: {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        },
        allDayText: '終日',

        events: async function(fetchInfo, successCallback, failureCallback) {
            try {
                const response = await fetch('/.netlify/functions/get-calendar-events');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                successCallback(data.calendarEvents); 
                renderAlwaysOpenRecruitment(data.alwaysOpenRecruitment);

            } catch (error) {
                console.error("Error fetching events:", error);
                failureCallback(error);
            }
        },

        eventContent: function(arg) {
            const div = document.createElement('div');
            div.innerHTML = `<strong>${arg.event.title}</strong>`;
            return { domNodes: [div] };
        },

        eventClick: function(info) {
            info.jsEvent.preventDefault();
            displayEventModal(info.event);
        }
    });

    calendar.render();

    // 常時公募枠を表示する関数
    function renderAlwaysOpenRecruitment(recruitmentItems) {
        if (!alwaysOpenSection || !alwaysOpenList) {
            console.error("DEBUG: Always open section or list elements not found!");
            return; 
        }

        alwaysOpenList.innerHTML = ''; 

        if (recruitmentItems.length === 0) {
            alwaysOpenList.innerHTML = '<p style="text-align: center; color: #6c757d;">現在、常時公募枠はありません。</p>';
            alwaysOpenSection.style.display = 'block'; 
            return;
        }

        recruitmentItems.forEach(item => {
            console.log("DEBUG: Rendering always open item:", item.title);
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('always-open-item'); 
            
            const circleNameText = item.title || item.extendedProps.circleName || '不明なサークル';

            itemDiv.innerHTML = `
                <h3 class="always-open-title">${circleNameText}</h3>
            `; 

            alwaysOpenList.appendChild(itemDiv);
            console.log("DEBUG: Appended itemDiv for:", circleNameText, " with class:", itemDiv.className);


            itemDiv.addEventListener('click', () => {
                displayEventModal(item); 
            });
        });
        alwaysOpenSection.style.display = 'block'; 
        console.log("DEBUG: Always open section set to display: block.");
    }

    // モーダルを閉じるロジック
    const modal = document.getElementById('eventModal');
    const closeButton = document.querySelector('.close-button');

    closeButton.onclick = function() {
        modal.style.display = 'none';
        document.getElementById('modalTweetEmbed').innerHTML = ''; 
    };

    window.onclick = function(event) {
        if (event.target === modal) { 
            modal.style.display = 'none';
            document.getElementById('modalTweetEmbed').innerHTML = '';
        }
    };
});
// main.js の末尾（DOMContentLoadedの中）に追加

const accordionTrigger = document.querySelector('.accordion-trigger');
const accordionContent = document.querySelector('.accordion-content');
const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');

if (accordionTrigger) {
    accordionTrigger.addEventListener('click', () => {
        alwaysOpenSection.classList.toggle('active');
        if (alwaysOpenSection.classList.contains('active')) {
            // コンテンツの実際の高さにmax-heightを設定してアニメーション
            accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        } else {
            accordionContent.style.maxHeight = '0';
        }
    });
}
