// =======================================================================
// js/main.js (UI改善・標準レンダリング復帰版)
// =======================================================================
document.addEventListener("DOMContentLoaded", function () {
    const calendarEl = document.getElementById("calendar");

    // UI Elements
    const alwaysOpenSection = document.getElementById(
        "alwaysOpenRecruitmentSection"
    );
    const alwaysOpenList = document.getElementById("alwaysOpenRecruitmentList");
    const alwaysOpenToggleBtn = document.getElementById("alwaysOpenToggleBtn");
    const alwaysOpenCount = document.getElementById("alwaysOpenCount");
    const alwaysOpenIcon = document.querySelector(".toggle-icon");

    // Hamburger Menu
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const header = document.querySelector("header");
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener("click", () => {
            header.classList.toggle("nav-open");
            const isExpanded =
                hamburgerBtn.getAttribute("aria-expanded") === "true";
            hamburgerBtn.setAttribute("aria-expanded", !isExpanded);
        });
    }

    // --- Calendar Configuration ---
    const isMobile = window.innerWidth < 768;
    const initialViewType = isMobile ? "listMonth" : "dayGridMonth";

    const calendar = new FullCalendar.Calendar(calendarEl, {
        timeZone: "local",
        locale: "ja",
        initialView: initialViewType,
        contentHeight: "auto",
        displayEventTime: true,
        // 0時ちょうどに終わるイベントは、その日の表示に含めない
        nextDayThreshold: "00:00:00",

        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,listMonth",
        },
        buttonText: {
            today: "今日",
            listMonth: "リスト",
            dayGridMonth: "カレンダー",
        },

        eventTimeFormat: {
            hour: "2-digit",
            minute: "2-digit",
            meridiem: false,
            hour12: false,
        },

        windowResize: function (view) {
            const currentIsMobile = window.innerWidth < 768;
            if (currentIsMobile && view.type === "dayGridMonth") {
                calendar.changeView("listMonth");
            } else if (!currentIsMobile && view.type === "listMonth") {
                calendar.changeView("dayGridMonth");
            }
        },

        events: async function (fetchInfo, successCallback, failureCallback) {
            try {
                // ダミーパスのままです。実際の環境に合わせてください。
                const response = await fetch(
                    "/.netlify/functions/get-calendar-events"
                );
                if (!response.ok)
                    throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                successCallback(data.calendarEvents);
                renderAlwaysOpenRecruitment(data.alwaysOpenRecruitment);
            } catch (error) {
                console.error("Error fetching events:", error);
                failureCallback(error);
            }
        },

        // --- Custom Rendering ---
        eventContent: function (arg) {
            const event = arg.event;
            const isList = arg.view.type === "listMonth";
            const startStr = formatTimeSimple(event.start);
            const endStr = event.end ? formatTimeSimple(event.end) : "";

            // === List View ===
            if (isList) {
                let timeHtml = "";
                let labelHtml = "";

                if (arg.isStart && arg.isEnd) {
                    timeHtml = endStr ? `${startStr} - ${endStr}` : startStr;
                } else if (arg.isStart) {
                    timeHtml = startStr;
                    labelHtml = `<span class="list-badge start-badge">開始</span>`;
                } else if (arg.isEnd) {
                    timeHtml = endStr;
                    labelHtml = `<span class="list-badge end-badge">終了</span>`;
                } else {
                    labelHtml = `<span class="list-badge during-badge">期間中</span>`;
                }

                return {
                    html: `
                        <div class="fc-list-custom-content">
                            <div class="list-time-col">${timeHtml}</div>
                            ${labelHtml}
                            <span class="list-title-text">${event.title}</span>
                        </div>
                    `,
                };
            }
            // === Month Grid View (標準レンダリングに戻す) ===
            else {
                // isStart/isEnd は「そのセグメントが」イベントの開始/終了かを示す
                const startClass = arg.isStart ? "is-start" : "";
                const endClass = arg.isEnd ? "is-end" : "";

                // バッジ作成（00:00以外なら表示）
                let leftBadge = "";
                let rightBadge = "";
                if (arg.isStart && startStr !== "00:00") {
                    leftBadge = `<span class="pc-time-badge pc-start-time">${startStr}</span>`;
                }
                if (arg.isEnd && endStr !== "00:00") {
                    rightBadge = `<span class="pc-time-badge pc-end-time">${endStr}</span>`;
                }

                // style属性での幅・マージン指定を削除
                return {
                    html: `
                        <div class="pc-event-bar ${startClass} ${endClass}">
                            <div class="pc-event-left">${leftBadge}</div>
                            <div class="pc-event-center">${event.title}</div>
                            <div class="pc-event-right">${rightBadge}</div>
                        </div>
                    `,
                };
            }
        },

        eventClick: function (info) {
            info.jsEvent.preventDefault();
            displayEventModal(info.event);
        },
    });

    calendar.render();

    // ===================================================================
    //  Helper Functions
    // ===================================================================

    // Accordion
    if (alwaysOpenToggleBtn) {
        alwaysOpenToggleBtn.addEventListener("click", function () {
            const isHidden = alwaysOpenList.style.display === "none";
            alwaysOpenList.style.display = isHidden ? "flex" : "none";
            if (alwaysOpenIcon)
                alwaysOpenIcon.style.transform = isHidden
                    ? "rotate(180deg)"
                    : "rotate(0deg)";
        });
    }

    function renderAlwaysOpenRecruitment(items) {
        if (!alwaysOpenSection || !alwaysOpenList) return;
        if (alwaysOpenCount)
            alwaysOpenCount.textContent = items ? items.length : 0;
        alwaysOpenList.innerHTML = "";

        if (!items || items.length === 0) {
            alwaysOpenSection.style.display = "none";
            return;
        }

        items.forEach((item) => {
            const itemDiv = document.createElement("div");
            itemDiv.classList.add("always-open-item");
            itemDiv.innerHTML = `<div class="always-open-content"><h3>${item.title}</h3><span class="arrow-icon">›</span></div>`;
            itemDiv.addEventListener("click", () => {
                const eventData = { ...item, start: new Date(), end: null };
                displayEventModal(eventData);
            });
            alwaysOpenList.appendChild(itemDiv);
        });
        alwaysOpenSection.style.display = "block";
        alwaysOpenList.style.display = "none";
    }

    // Modal
    const modal = document.getElementById("eventModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalCircleName = document.getElementById("modalCircleName");
    const modalDuration = document.getElementById("modalDuration");
    const modalRelatedInfo = document.getElementById("modalRelatedInfo");
    const modalTweetEmbed = document.getElementById("modalTweetEmbed");
    const modalTweetLink = document.getElementById("modalTweetLink");
    const closeButton = document.querySelector(".close-button");

    function displayEventModal(eventData) {
        const props = eventData.extendedProps || eventData;
        const titleText = eventData.title || props.title;

        modalTitle.textContent = titleText;

        if (props.clubId) {
            modalCircleName.innerHTML = `<a href="/circle.html?id=${
                props.clubId
            }" target="_blank" style="color:#007bff; text-decoration:none;">${
                props.circleName || "不明"
            } 🔗</a>`;
        } else {
            modalCircleName.textContent = props.circleName || "不明";
        }

        modalRelatedInfo.innerHTML = props.relatedInfo
            ? window.marked
                ? marked.parse(props.relatedInfo)
                : props.relatedInfo
            : "なし";

        if (props.recruitmentType === "常時公募") {
            modalDuration.parentElement.style.display = "none";
        } else {
            modalDuration.parentElement.style.display = "block";
            let dateText = "";

            if (eventData.start) {
                const s = toDate(eventData.start);
                const sStr = formatDateTimeJP(s);

                if (eventData.end) {
                    const e = toDate(eventData.end);
                    const eStr = formatDateTimeJP(e, true);
                    dateText = `${sStr} - ${eStr}`;
                } else {
                    dateText = sStr;
                }
            }
            modalDuration.textContent = dateText;
        }

        // エリアをクリア
        modalTweetEmbed.innerHTML = ''; 
        modalTweetLink.innerHTML = ''; 
        
        if (props.tweetUrl) {
            modalTweetLink.innerHTML = `<p><a href="${props.tweetUrl}" target="_blank" class="twitter-link-btn">Twitterで元のツイートを見る</a></p>`;
            
            const tweetIdMatch = props.tweetUrl.match(/\/status\/(\d+)/);
            if (tweetIdMatch && window.twttr && window.twttr.widgets) {
                
                // ★修正: 「読み込み中」の作成処理は全削除しました

                // ツイート表示専用の箱を作成
                const tweetContainer = document.createElement('div');
                
                // ★修正: CSSで幅を広げるためのクラスを付与
                tweetContainer.className = 'tweet-container-box'; 
                
                modalTweetEmbed.appendChild(tweetContainer);

                // ツイート作成
                window.twttr.widgets.createTweet(
                    tweetIdMatch[1], 
                    tweetContainer, 
                    { theme: 'light', conversation: 'none', dnt: true }
                ).then(el => {
                    if (!el) {
                        // ツイート生成失敗（Not Foundなど）
                        tweetContainer.innerHTML = '<p class="no-tweet" style="text-align:center; color:#999;">ツイートを表示できません</p>';
                    }
                });
                // catch等は不要（何も表示しなければいいので）ですが、念のためログだけ
            }
        } else {
            modalTweetEmbed.innerHTML = '<p class="no-tweet">ツイートURLなし</p>';
        }

        // ... (後略) ...

        modal.style.display = "block";
    }

    if (closeButton) {
        closeButton.onclick = () => {
            modal.style.display = "none";
            modalTweetEmbed.innerHTML = "";
        };
    }
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
            modalTweetEmbed.innerHTML = "";
        }
    };

    // Utilities
    function formatTimeSimple(d) {
        if (!d) return "";
        const dateObj = toDate(d);
        return (
            String(dateObj.getHours()).padStart(2, "0") +
            ":" +
            String(dateObj.getMinutes()).padStart(2, "0")
        );
    }

    function toDate(d) {
        return d instanceof Date ? d : new Date(d);
    }

    function formatDateTimeJP(d, isEnd = false) {
        if (!d) return "";
        let dateObj = new Date(d);
        if (isEnd && dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
            dateObj.setDate(dateObj.getDate() - 1);
            const mm = dateObj.getMonth() + 1;
            const dd = dateObj.getDate();
            return `${mm}/${dd} 24:00`;
        }
        const mm = dateObj.getMonth() + 1;
        const dd = dateObj.getDate();
        const hh = String(dateObj.getHours()).padStart(2, "0");
        const min = String(dateObj.getMinutes()).padStart(2, "0");
        return `${mm}/${dd} ${hh}:${min}`;
    }

    // Analytics
    (function () {
        const GA_ID = "G-HN3YK955QX";
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            dataLayer.push(arguments);
        }
        gtag("js", new Date());
        gtag("config", GA_ID);
    })();
});
