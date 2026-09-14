// =======================================================================
// js/main.js (修正版：過去予定表示＆ブロック表示修正)
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

    // --- Circle Search Elements ---
    const circleSearchForm = document.getElementById("circleSearchForm");
    const circleSearchInput = document.getElementById("circleSearchInput");
    const circleSearchBtn = document.getElementById("circleSearchBtn");
    const searchSuggestions = document.getElementById("searchSuggestions");
    const searchResultSection = document.getElementById("searchResultSection");
    const searchResultContainer = document.getElementById(
        "searchResultContainer"
    );
    const backToCalendarBtn = document.getElementById("backToCalendarBtn");
    let searchTimeout = null;

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

    // --- Circle Search ---
    if (circleSearchForm) {
        circleSearchForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const query = circleSearchInput.value.trim();
            if (query.length < 1) return;
            hideSuggestions();
            performCircleSearch(query);
        });
    }

    if (circleSearchInput) {
        circleSearchInput.addEventListener("input", function () {
            clearTimeout(searchTimeout);
            const query = circleSearchInput.value.trim();
            if (query.length < 2) {
                hideSuggestions();
                return;
            }
            searchTimeout = setTimeout(() => {
                fetchCircleSuggestions(query);
            }, 300);
        });

        // クリックoutsideで候補を閉じる
        document.addEventListener("click", function (e) {
            if (
                !circleSearchInput.contains(e.target) &&
                !searchSuggestions.contains(e.target)
            ) {
                hideSuggestions();
            }
        });
    }

    if (backToCalendarBtn) {
        backToCalendarBtn.addEventListener("click", function () {
            searchResultSection.style.display = "none";
            calendarEl.style.display = "block";
            if (alwaysOpenSection) alwaysOpenSection.style.display = "";
            document.getElementById("circleSearchSection").style.display = "";
            // カレンダーのサイズを再計算
            setTimeout(() => calendar.render(), 50);
        });
    }

    async function fetchCircleSuggestions(query) {
        try {
            const resp = await fetch(
                `/.netlify/functions/search-circles?q=${encodeURIComponent(query)}`
            );
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.error || !data.clubs || data.clubs.length === 0) {
                hideSuggestions();
                return;
            }
            showSuggestions(data.clubs.slice(0, 8));
        } catch (err) {
            console.error("Suggestions fetch error:", err);
        }
    }

    function showSuggestions(clubs) {
        searchSuggestions.innerHTML = "";
        clubs.forEach((club) => {
            const div = document.createElement("div");
            div.classList.add("suggestion-item");
            div.textContent = club.clubName;
            div.addEventListener("click", () => {
                circleSearchInput.value = club.clubName;
                hideSuggestions();
                performCircleSearch(club.clubName);
            });
            searchSuggestions.appendChild(div);
        });
        searchSuggestions.style.display = "block";
    }

    function hideSuggestions() {
        searchSuggestions.style.display = "none";
        searchSuggestions.innerHTML = "";
    }

    async function performCircleSearch(query) {
        // カレンダーを非表示、検索結果を表示
        calendarEl.style.display = "none";
        if (alwaysOpenSection) alwaysOpenSection.style.display = "none";
        document.getElementById("circleSearchSection").style.display = "none";
        searchResultSection.style.display = "block";
        searchResultContainer.innerHTML =
            '<div class="loading-indicator"><p>検索中...</p></div>';

        try {
            const resp = await fetch(
                `/.netlify/functions/search-circles?q=${encodeURIComponent(query)}`
            );
            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            renderSearchResults(data.clubs, data.recruitmentHistory);
        } catch (err) {
            console.error("Search error:", err);
            searchResultContainer.innerHTML = `<p style="color:red;text-align:center;">検索に失敗しました: ${err.message}</p>`;
        }
    }

    function renderSearchResults(clubs, recruitmentHistory) {
        if (!clubs || clubs.length === 0) {
            searchResultContainer.innerHTML = `
                <div class="search-empty-state">
                    <p>「${circleSearchInput.value.trim()}」に一致するサークルは見つかりませんでした。</p>
                    <p>別のキーワードで試してください。</p>
                </div>`;
            return;
        }

        let html = '<div class="search-results-layout">';

        // 左側: サークル一覧
        html += '<div class="circle-list-panel"><h2 class="search-panel-title">検索結果（サークル）</h2><ul class="circle-list">';
        clubs.forEach((club) => {
            const count = recruitmentHistory.filter(
                (r) => r.club && r.club.id === club.id
            ).length;
            html += `<li class="circle-list-item" data-club-id="${club.id}">
                <span class="circle-list-name">${club.clubName}</span>
                <span class="circle-list-count">${count}件</span>
            </li>`;
        });
        html += "</ul></div>";

        // 右側: 選択したサークルの公募履歴（デフォルトは最初のサークル）
        const defaultClub = clubs[0];
        const defaultHistory = recruitmentHistory.filter(
            (r) => r.club && r.club.id === defaultClub.id
        );
        html += `<div class="history-panel">
            <h2 class="search-panel-title" id="historyPanelTitle">${defaultClub.clubName} の公募履歴</h2>
            <div id="historyList" class="history-list">`;

        if (defaultHistory.length === 0) {
            html += '<p class="no-history">公募履歴が見つかりませんでした。</p>';
        } else {
            defaultHistory.forEach((item) => {
                const startDate = formatSearchDate(item.startDateTime);
                const endDate = formatSearchDate(item.endDateTime, true);
                const typeLabel =
                    item.recruitmentType === "常時公募"
                        ? '<span class="type-badge always-open">常時公募</span>'
                        : '<span class="type-badge normal">期間限定</span>';

                html += `<div class="history-item" data-event-id="${item.id}" data-club-id="${item.club.id}">
                    <div class="history-item-main">
                        <span class="history-type">${typeLabel}</span>
                        <span class="history-title">${item.club.clubName}</span>
                    </div>
                    <div class="history-dates">
                        <span class="history-start">${startDate}</span>
                        ${item.endDateTime ? ` - <span class="history-end">${endDate}</span>` : ""}
                    </div>
                </div>`;
            });
        }

        html += "</div></div>";
        html += "</div>";

        searchResultContainer.innerHTML = html;

        // サークルリストのクリックイベント
        document.querySelectorAll(".circle-list-item").forEach((li) => {
            li.addEventListener("click", function () {
                const clubId = this.dataset.clubId;
                const club = clubs.find((c) => c.id === clubId);
                const history = recruitmentHistory.filter(
                    (r) => r.club && r.club.id === clubId
                );

                // アクティブ状態を更新
                document
                    .querySelectorAll(".circle-list-item")
                    .forEach((el) => el.classList.remove("active"));
                this.classList.add("active");

                // 履歴パネルを更新
                document.getElementById("historyPanelTitle").textContent =
                    club.clubName + " の公募履歴";
                const historyList = document.getElementById("historyList");

                if (history.length === 0) {
                    historyList.innerHTML =
                        '<p class="no-history">公募履歴が見つかりませんでした。</p>';
                    return;
                }

                let historyHtml = "";
                history.forEach((item) => {
                    const startDate = formatSearchDate(item.startDateTime);
                    const endDate = formatSearchDate(item.endDateTime, true);
                    const typeLabel =
                        item.recruitmentType === "常時公募"
                            ? '<span class="type-badge always-open">常時公募</span>'
                            : '<span class="type-badge normal">期間限定</span>';

                    historyHtml += `<div class="history-item" data-event-id="${item.id}" data-club-id="${item.club.id}">
                        <div class="history-item-main">
                            <span class="history-type">${typeLabel}</span>
                            <span class="history-title">${item.club.clubName}</span>
                        </div>
                        <div class="history-dates">
                            <span class="history-start">${startDate}</span>
                            ${item.endDateTime ? ` - <span class="history-end">${endDate}</span>` : ""}
                        </div>
                    </div>`;
                });
                historyList.innerHTML = historyHtml;

                // 履歴アイテムのクリックイベント（モーダル表示）
                historyList.querySelectorAll(".history-item").forEach(
                    (itemEl) => {
                        itemEl.addEventListener("click", () => {
                            const eventId = itemEl.dataset.eventId;
                            const eventData = recruitmentHistory.find(
                                (r) => r.id === eventId
                            );
                            if (eventData) {
                                const modalEventData = {
                                    ...eventData,
                                    start: new Date(eventData.startDateTime),
                                    end: eventData.endDateTime
                                        ? new Date(eventData.endDateTime)
                                        : null,
                                    title: eventData.club.clubName,
                                };
                                displayEventModal(modalEventData);
                            }
                        });
                    }
                );
            });
        });

        // デフォルト選択を最初のサークルに
        const firstItem = document.querySelector(".circle-list-item");
        if (firstItem) firstItem.classList.add("active");

        // 履歴アイテムのクリックイベント（初回分）
        document.querySelectorAll(".history-item").forEach((itemEl) => {
            itemEl.addEventListener("click", () => {
                const eventId = itemEl.dataset.eventId;
                const eventData = recruitmentHistory.find(
                    (r) => r.id === eventId
                );
                if (eventData) {
                    const modalEventData = {
                        ...eventData,
                        start: new Date(eventData.startDateTime),
                        end: eventData.endDateTime
                            ? new Date(eventData.endDateTime)
                            : null,
                        title: eventData.club.clubName,
                    };
                    displayEventModal(modalEventData);
                }
            });
        });
    }

    function formatSearchDate(dateStr, isEnd = false) {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        if (isEnd && d.getHours() === 0 && d.getMinutes() === 0) {
            return `${year}/${mm}/${dd} 24:00`;
        }
        return `${year}/${mm}/${dd} ${hh}:${min}`;
    }

    // --- Calendar Configuration ---
    const isMobile = window.innerWidth < 768;
    const initialViewType = isMobile ? "listMonth" : "dayGridMonth";

    // ... (前略) ...

    const calendar = new FullCalendar.Calendar(calendarEl, {
        timeZone: "local",
        locale: "ja",

        // ★以前の指示通り validRange は削除済み

        initialView: initialViewType,
        contentHeight: "auto",
        displayEventTime: true,
        nextDayThreshold: "00:00:00",

        // =========================================================
        // ★修正1: 自作の「今日」ボタンを作る
        // =========================================================
        customButtons: {
            myTodayButton: {
                text: "今日",
                click: function () {
                    calendar.today();

                    setTimeout(() => {
                        if (calendar.view.type === "listMonth") {
                            const todayEl = document.querySelector(
                                ".fc-list-day.fc-day-today"
                            );
                            if (todayEl) {
                                // ★修正: block: 'center' を 'start' に変更
                                // これで要素が画面の一番上に来るようにスクロールします
                                todayEl.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                });
                            }
                        }
                    }, 100);
                },
            },
        },

        // =========================================================
        // ★修正2: ヘッダーのボタン配置を変更
        // 標準の 'today' ではなく、自作した 'myTodayButton' を配置します
        // =========================================================
        headerToolbar: {
            left: "prev,next myTodayButton", // ←ここを書き換え
            center: "title",
            right: "dayGridMonth,listMonth",
        },

        buttonText: {
            // today: "今日", // ←自作ボタン側でtext指定したのでここは不要になります（残しても害はないです）
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
        // --- Custom Rendering (修正版) ---
        eventContent: function (arg) {
            const event = arg.event;
            const isList = arg.view.type === "listMonth";

            // ★修正: 時間フォーマット関数（24:00対応版）
            const formatTimeCustom = (d, isEnd = false) => {
                if (!d) return "";
                const h = d.getHours();
                const m = d.getMinutes();
                // 終了時間が 0:00 の場合のみ "24:00" と表記する
                if (isEnd && h === 0 && m === 0) {
                    return "24:00";
                }
                return (
                    String(h).padStart(2, "0") +
                    ":" +
                    String(m).padStart(2, "0")
                );
            };

            const startStr = formatTimeCustom(event.start);
            // 終了時間には true を渡して 24:00 変換を有効にする
            const endStr = event.end ? formatTimeCustom(event.end, true) : "";

            // === List View ===
            if (isList) {
                let timeHtml = "";
                let labelHtml = "";

                // パターンA: その日のうちに完結する、またはその日の24:00に終わる
                if (arg.isStart && arg.isEnd) {
                    timeHtml = endStr ? `${startStr} - ${endStr}` : startStr;
                }
                // パターンB: 日を跨ぐ予定の「開始日」
                else if (arg.isStart) {
                    // 「XX:XX - 00:00」とならないよう、「XX:XX -」とだけ表記
                    timeHtml = `${startStr} -`;
                    labelHtml = `<span class="list-badge start-badge">開始</span>`;
                }
                // パターンC: 日を跨ぐ予定の「終了日」
                else if (arg.isEnd) {
                    // 「00:00 - XX:XX」とならないよう、「- XX:XX」とだけ表記
                    timeHtml = `- ${endStr}`;
                    labelHtml = `<span class="list-badge end-badge">終了</span>`;
                }
                // パターンD: 日を跨ぐ予定の「中日（なかび）」
                else {
                    timeHtml = "終日"; // 00:00 - 00:00 の代わりに「終日」と表示
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
            // === Month Grid View (PC版カレンダー) ===
            else {
                const startClass = arg.isStart ? "is-start" : "";
                const endClass = arg.isEnd ? "is-end" : "";

                // バッジ作成
                let leftBadge = "";
                let rightBadge = "";

                // 左バッジ：開始時刻 (00:00以外なら表示)
                if (arg.isStart && startStr !== "00:00") {
                    leftBadge = `<span class="pc-time-badge pc-start-time">${startStr}</span>`;
                }
                // 右バッジ：終了時刻 (00:00以外、かつ開始バッジと被らない場合のみ)
                // 24:00対応により、00:00終了のイベントも「24:00」バッジが表示されるようになります
                if (arg.isEnd && endStr !== "00:00") {
                    rightBadge = `<span class="pc-time-badge pc-end-time">${endStr}</span>`;
                }

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
        modalTweetEmbed.innerHTML = "";
        modalTweetLink.innerHTML = "";

        if (props.tweetUrl) {
            modalTweetLink.innerHTML = `<p><a href="${props.tweetUrl}" target="_blank" class="twitter-link-btn">Twitterで元のツイートを見る</a></p>`;

            const tweetIdMatch = props.tweetUrl.match(/\/status\/(\d+)/);
            if (tweetIdMatch && window.twttr && window.twttr.widgets) {
                const tweetContainer = document.createElement("div");
                tweetContainer.className = "tweet-container-box";

                modalTweetEmbed.appendChild(tweetContainer);

                window.twttr.widgets
                    .createTweet(tweetIdMatch[1], tweetContainer, {
                        theme: "light",
                        conversation: "none",
                        dnt: true,
                    })
                    .then((el) => {
                        if (!el) {
                            tweetContainer.innerHTML =
                                '<p class="no-tweet" style="text-align:center; color:#999;">ツイートを表示できません</p>';
                        }
                    });
            }
        } else {
            modalTweetEmbed.innerHTML =
                '<p class="no-tweet">ツイートURLなし</p>';
        }

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
