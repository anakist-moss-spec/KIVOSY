// --- 1. Settings & English Categories ---
const kivosyMessages = [
    "KIVOSY is aligning with the universe...", 
    "Reading your cosmic energy via KIVOSY...", 
    "KIVOSY is shuffling the cards of destiny..."
];

const categories = {
    Love: ['love', 'crush', 'relationship', 'feelings', 'date', 'ex', 'marry', 'heart'],
    Success: ['success', 'job', 'career', 'pass', 'exam', 'interview', 'promotion', 'work', 'business'],
    Wealth: ['wealth', 'money', 'investment', 'finance', 'profit', 'cash', 'fortune', 'rich']
};

// [A] 추천 질문 데이터 세트
const followUpQuestions = {
    Love: ["What is their true feeling for me? 💓", "How can I improve this relationship? ✨", "What should I avoid in love? 🚫"],
    Success: ["What is the biggest obstacle to my success? 🚧", "Should I take a risk or stay safe? ⚖️", "Who will help me succeed? 🤝"],
    Wealth: ["How can I increase my income? 💸", "Is now a good time to spend? 🛒", "Where is my hidden money luck? 🍀"],
    General: ["What should I focus on today? 🧘", "What surprise is coming my way? 🎁", "A message for my soul. ✨"]
};

// [B] 추천 질문 버튼 생성 함수 (타이핑 없이 즉시 실행됨)
function showFollowUps(category) {
    const container = document.getElementById('follow-up-container');
    if (!container) return;
    
    container.innerHTML = `<p style="color: var(--gold); font-size: 0.85rem; margin-bottom: 5px; opacity: 0.8; text-align:center;">🔍 Suggested questions:</p>`;
    const questions = followUpQuestions[category] || followUpQuestions.General;
    
    questions.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        btn.style = "width: 100%; margin: 4px 0; text-align: left; padding: 12px; font-size: 0.9rem; background: rgba(255,215,0,0.05);";
        btn.innerHTML = q;
        btn.onclick = () => {
            document.getElementById('question').value = q;
            resetGame(); // 위로 스크롤 및 초기화
            drawCard();  // 즉시 실행!
        };
        container.appendChild(btn);
    });
}

async function drawCard() {
    const inner = document.getElementById('cardInner');
    const questionInput = document.getElementById('question');
    const loader = document.getElementById('kivosyLoader');
    const loaderMsg = document.getElementById('loaderMessage');
    const descText = document.getElementById('descText');
    const readMoreBtn = document.getElementById('readMoreBtn');
    const resultArea = document.getElementById('resultArea');
    
    let matchedSection = null; 

    if (inner.classList.contains('flipped')) return;

    // 클릭 소리
    const clickSound = document.getElementById('sound-click');
    if (clickSound) clickSound.play();

    const isQuestionEmpty = questionInput.value.trim() === "";

    try {
        loader.style.display = 'block';
        inner.classList.add('shaking');
        
        loaderMsg.innerText = isQuestionEmpty 
            ? "KIVOSY is reading your energy for the day..." 
            : "Searching for answers to your question...";

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 1. 스타일 결정 (금색 vs 오리지널)
        const selectedStyle = Math.random() < 0.5 ? 'gold' : 'original';

        // 2. 카드 랜덤 선택 (이 줄이 꼭 있어야 합니다!)
        const randomIndex = Math.floor(Math.random() * tarotData.length);
        const cardData = tarotData[randomIndex];

        // 3. AI 및 해석 선택
        const aiNames = Object.keys(cardData.interpretations);
        const randomAI = aiNames[Math.floor(Math.random() * aiNames.length)];
        const selectedReply = cardData.interpretations[randomAI];

        const question = questionInput.value.toLowerCase();
        let bodyHTML = "";


        // ✨ 핵심: "그래서 어쩌라는 거야?"를 해결해주는 우주의 한 줄 평
        const introMessage = `
            <div style="text-align: center; margin-bottom: 25px; padding: 20px; background: rgba(255,215,0,0.05); border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.3); border-top: 4px solid var(--gold);">
                <span style="color: var(--gold); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; display: block; margin-bottom: 10px;">The Universe's Direct Guidance</span>
                <p style="font-size: 1.2rem; color: #fff; font-style: italic; line-height: 1.6; font-family: 'Georgia', serif; margin: 0;">
                    "${cardData.ans === 'YES' 
                        ? `The energy of ${cardData.name} says: <strong style="color: var(--gold); font-style: normal;">Go for it.</strong> The path is clear, so stop doubting and take that first step.` 
                        : `The energy of ${cardData.name} says: <strong style="color: #ff4d4d; font-style: normal;">Wait.</strong> This is not a 'No', but a 'Not yet'. Re-evaluate before you leap.`}"
                </p>
            </div>
        `;

        // 카테고리 매칭 및 본문 생성
        if (!isQuestionEmpty) {
            for (const [section, keywords] of Object.entries(categories)) {
                if (keywords.some(kw => question.includes(kw))) {
                    matchedSection = section; 
                    break;
                }
            }
            bodyHTML = matchedSection 
                ? extractSectionHTML(selectedReply, matchedSection)
                : `<div class="full-text">${selectedReply.replace(/\n/g, '<br><br>')}</div>`;
        } else {
            bodyHTML = `
                <div class="section-title">✨ Today's General Energy ✨</div>
                <div class="full-text">${selectedReply.replace(/\n/g, '<br><br>')}</div>
            `;
        }

        const finalHTML = introMessage + bodyHTML;

        // 1. 먼저 feedbackHTML을 정의합니다 (finalHTML 바로 위에 적어주세요)
        const feedbackHTML = `
            <div style="margin-top: 30px; border-top: 1px dashed rgba(212, 175, 55, 0.2); padding-top: 20px; text-align: center;">
                <p style="font-size: 0.85rem; color: #888; margin-bottom: 15px;">Was this guidance clear to you?</p>
                <div style="display: flex; justify-content: center; gap: 15px;">
                    <button class="feedback-btn" style="padding: 8px 15px; background: transparent; border: 1px solid rgba(212,175,55,0.4); color: #aaa; border-radius: 20px; cursor: pointer; font-size: 0.8rem;">Yes, it helped</button>
                    <button class="feedback-btn" style="padding: 8px 15px; background: transparent; border: 1px solid rgba(212,175,55,0.4); color: #aaa; border-radius: 20px; cursor: pointer; font-size: 0.8rem;">Still seeking</button>
                </div>
            </div>
        `;

        // 데이터 삽입
        // 선택된 스타일(gold 또는 original) 폴더에서 이미지를 가져옵니다.
        cardImage.src = `img/tarot/${selectedStyle}/${cardData.img}.webp`;
        document.getElementById('answerText').innerText = cardData.ans;
        document.getElementById('cardName').innerText = cardData.name;
        // 기존: document.getElementById('aiSource').innerText = `— Interpretation by ${randomAI} —`;
        // 수정:
        document.getElementById('aiSource').innerHTML = `
            <span style="opacity: 0.6; font-size: 0.8rem; letter-spacing: 1px;">
                Guided by the wisdom of <b style="color: var(--gold);">${randomAI}</b>
            </span>
        `;


        // 글자 자르기 (IntroMessage는 살리고 본문만 자름)
        // --- [수정] 글자 자르기 및 상세 페이지 이동 로직 ---
        const summaryLimit = 350; 
        if (bodyHTML.length > summaryLimit) {
            descText.innerHTML = introMessage + bodyHTML.substring(0, summaryLimit) + "...";
            readMoreBtn.style.display = 'block';
            
            // ✨ 이 버튼을 눌렀을 때 개별 상세 페이지로 이동하게 만듭니다!
            readMoreBtn.onclick = () => {
                // 파일명 규칙: 소문자 변환, 공백을 하이픈(-)으로 변경
                const cardFileName = cardData.name.toLowerCase().replace(/ /g, "-") + ".html";
                
                // 생성된 카드가 있는 경로로 이동 (index.html 기준)
                window.location.href = `cards/en/${cardFileName}`;
            };
        } else {
            descText.innerHTML = finalHTML;
            readMoreBtn.style.display = 'none';
        }

        // 1. 로더와 쉐이킹 먼저 멈추기
        loader.style.display = 'none';
        inner.classList.remove('shaking');

        // 2. 카드 뒤집기 시작 & 소리 재생
        inner.classList.add('flipped'); 
        const flipSound = document.getElementById('sound-flip');
        if (flipSound) flipSound.play();

        // 3. ✨ 추천 질문은 여기서 딱 한 번만 호출 (카드가 뒤집히는 동안 생성됨)
        showFollowUps(matchedSection || "General");

        // 4. 애니메이션이 끝날 즈음 결과창 노출
        setTimeout(() => {
            resultArea.style.display = 'block';
            window.scrollTo({ 
                top: resultArea.offsetTop - 470, 
                behavior: 'smooth' 
            });
        }, 600);


        // 히스토리 저장 데이터에 ans 추가
        const historyEntry = {
            date: new Date().toISOString(), 
            question: questionInput.value || "General Reading",
            cardName: cardData.name,
            cardImg: cardData.img,
            ans: cardData.ans,
            // ✨ 바로 아래 줄 끝에 쉼표(,)가 있어야 다음 줄이 정상 작동합니다!
            category: matchedSection || "General", 
            style: selectedStyle 
        };

        let tarotHistory = JSON.parse(localStorage.getItem('tarotHistory') || '[]');
        tarotHistory.push(historyEntry);
        if (tarotHistory.length > 50) tarotHistory.shift();
        localStorage.setItem('tarotHistory', JSON.stringify(tarotHistory));

        // ✨ 추가: 저장하자마자 아래 대시보드 업데이트!
        updateHistoryUI();


    } catch (error) {
        console.error("Error during execution:", error);
        if (loader) loader.style.display = 'none';
        inner.classList.remove('shaking');
    }
}

// 텍스트 추출 함수 (기존과 동일)
function extractSectionHTML(fullText, sectionType) {
    const cleanText = fullText.replace(/[#*\[\]]/g, '');
    const splitText = cleanText.replace(/([.;:!])\s+/g, "$1\n");
    const lines = splitText.split('\n');
    let result = [];
    let found = false;
    const keywords = { 
        'Love': ['love', 'relationship', 'heart'], 
        'Success': ['success', 'career', 'job', 'work'], 
        'Wealth': ['wealth', 'money', 'finance', 'fortune'] 
    };
    const targetKeywords = keywords[sectionType];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.length < 2) continue;
        const lowerLine = line.toLowerCase();
        const isHeaderCandidate = targetKeywords.some(kw => lowerLine.includes(kw.toLowerCase()));
        if (!found && isHeaderCandidate) {
            found = true;
            result.push(`<div class="section-title">✨ ${sectionType} Interpretation ✨</div>`);
        }
        if (found) {
            const isOtherHeader = Object.keys(keywords)
                .filter(k => k !== sectionType)
                .some(k => keywords[k].some(kw => lowerLine.includes(kw.toLowerCase())));
            if (isOtherHeader && result.length > 2) break;
            result.push(`<p class="section-p">${line}</p>`);
        }
    }
    return result.length <= 1 ? `<div class="full-text">${fullText.replace(/\n/g, '<br><br>')}</div>` : result.join('');
}

function resetGame() {
    const inner = document.getElementById('cardInner');
    inner.classList.remove('flipped');
    inner.classList.remove('shaking');
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('question').value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setQuestion(text) {
    const qInput = document.getElementById('question');
    if (qInput) {
        qInput.value = text;
        qInput.focus();
    }
}

function saveCardImage() {
    const img = document.getElementById('cardImage');
    const cardName = document.getElementById('cardName').innerText;
    const answer = document.getElementById('answerText').innerText;
    
    const descDiv = document.getElementById('descText');
    const pTag = descDiv.querySelector('div p'); 
    const universeMsg = pTag ? pTag.innerText : "";

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tempImg = new Image();
    tempImg.crossOrigin = "anonymous"; 
    tempImg.src = img.src + "?t=" + new Date().getTime();

    tempImg.onload = function() {
        const imageScale = 1.1; 
        const canvasPadding = 100;
        const drawWidth = tempImg.naturalWidth * imageScale;
        const drawHeight = tempImg.naturalHeight * imageScale;
        
        // --- 줄바꿈 및 높이 계산 로직 추가 ---
        const messageFont = "55px Georgia";
        ctx.font = messageFont;
        const maxWidth = (drawWidth + canvasPadding * 2) - 240;
        const words = universeMsg.split(' ');
        let lines = [];
        let currentLine = '';

        for(let n = 0; n < words.length; n++) {
            let testLine = currentLine + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(currentLine);
                currentLine = words[n] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine); // 마지막 줄 추가

        const lineHeight = 85; // 줄 간격
        const messageTotalHeight = lines.length * lineHeight;
        
        // 캔버스 높이 결정: 고정 높이 + 메시지 높이에 따른 가변 높이
        canvas.width = drawWidth + (canvasPadding * 2);
        canvas.height = drawHeight + 500 + messageTotalHeight; 
        
        // 배경 칠하기
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 카드 이미지 그리기
        const imgX = (canvas.width - drawWidth) / 2;
        const imgY = 60;
        ctx.drawImage(tempImg, imgX, imgY, drawWidth, drawHeight);
        
        // 1. YES / NO
        ctx.fillStyle = "#f9f295";
        ctx.font = "bold 150px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(answer, canvas.width / 2, imgY + drawHeight + 140);
        
        // 2. 카드 이름
        ctx.fillStyle = "#d4af37";
        ctx.font = "italic 80px Georgia";
        ctx.fillText(cardName, canvas.width / 2, imgY + drawHeight + 240);

        // 3. 우주의 메시지 (계산된 줄 수만큼 그리기)
        ctx.fillStyle = "#ffffff";
        ctx.font = messageFont;
        let startY = imgY + drawHeight + 360;
        lines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
        });

        // 4. 하단 주소 (항상 맨 바닥에서 70px 위로 고정)
        ctx.fillStyle = "rgba(212, 175, 55, 0.8)";
        ctx.font = "bold 55px Arial";
        ctx.fillText("KIVOSY.com", canvas.width / 2, canvas.height - 70);

        const link = document.createElement('a');
        link.download = `KIVOSY_Fate_${cardName}.webp`;
        link.href = canvas.toDataURL("image/webp");
        link.click();
    };
}


// --- 3단계: 히스토리 및 그래프 로직 ---

// 1. 페이지 로드 시 히스토리 불러오기
window.addEventListener('DOMContentLoaded', () => {
    updateHistoryUI();
});

// 2. 히스토리 UI 업데이트 (최근 8개만 갤러리에 노출)
function updateHistoryUI() {
    const history = JSON.parse(localStorage.getItem('tarotHistory') || '[]');
    const gallery = document.getElementById('history-gallery');
    if (!gallery) return;

    gallery.innerHTML = '';
    
    // 너무 많으면 지저분하니 최근 8개만 보여줌
    const displayHistory = [...history].reverse().slice(0, 8);

    displayHistory.forEach(item => {
        const cardThumb = document.createElement('div');
        cardThumb.style.cssText = `
            background: rgba(255,215,0,0.05);
            border: 1px solid rgba(212,175,55,0.2);
            border-radius: 12px;
            padding: 12px;
            text-align: center;
            transition: transform 0.3s;
        `;
        const dateObj = new Date(item.date);
        // 기존: const dateStr = `${dateObj.getMonth()+1}/${dateObj.getDate()}`;
        // 수정: 영문 월 이름 배열 추가 및 형식 변경
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dateStr = `${months[dateObj.getMonth()]} ${dateObj.getDate().toString().padStart(2, '0')}`;

        // updateHistoryUI 함수 내부의 이미지 소스 부분을 이렇게 수정하세요
        cardThumb.innerHTML = `
            <img src="img/tarot/${item.style || 'gold'}/${item.cardImg}.webp" 
                style="width: 100%; aspect-ratio: 9/16; object-fit: cover; border-radius: 8px; margin-bottom: 12px; filter: grayscale(0.2);">
            <div style="color: var(--gold); font-weight: bold; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${item.cardName}
            </div>
            <div style="color: #666; font-size: 0.65rem;">${dateStr}</div>
        `;
            gallery.appendChild(cardThumb);
        });

    renderDestinyChart(history);
}

// 기존 updateHistoryUI 끝부분에 있는 renderDestinyChart 호출 부분을 
// 아래와 같이 안전하게 정의해두면 좋습니다.
function renderDestinyChart(history) {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js 라이브러리가 로드되지 않았습니다.");
        return;
    }
    const canvas = document.getElementById('destinyChart');
    if (!canvas) return;
    
    drawChart(history);
}


// 3. 등락이 확실히 보이는 '에너지 지수' 그래프 (수정본)
function drawChart(history) {
    const canvas = document.getElementById('destinyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ✨ [수정 핵심] 기존에 그려진 차트가 있다면 파괴(Destroy)합니다.
    // 이 코드가 있어야 카드를 뽑을 때마다 그래프와 하단 갤러리가 새로고침됩니다.
    if (window.myChart instanceof Chart) {
        window.myChart.destroy();
    }

    const lastData = history.slice(-10);
    const labels = lastData.map((_, i) => `Reading ${i + 1}`);

    // 카드의 결과(YES/NO)에 따른 실제 점수 부여 로직
    const getScore = (item, type) => {
        if (item.category === type) {
            if (item.ans === 'YES') return 85 + (Math.random() * 15);    // 85~100점
            if (item.ans === 'MAYBE') return 40 + (Math.random() * 20);  // 40~60점
            return 20 + (Math.random() * 20);                            // 20~40점
        }
        return 10 + (Math.random() * 10); // 관련 없는 카테고리는 낮은 에너지
    };

    // ✨ window.myChart에 새 차트를 할당합니다.
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '💖 Love',
                    data: lastData.map(item => getScore(item, 'Love')),
                    borderColor: '#ff6b6b',
                    borderWidth: 3,
                    pointRadius: 4,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: '🚀 Success',
                    data: lastData.map(item => getScore(item, 'Success')),
                    borderColor: '#4facfe',
                    borderWidth: 3,
                    pointRadius: 4,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: '💰 Wealth',
                    data: lastData.map(item => getScore(item, 'Wealth')),
                    borderColor: '#d4af37',
                    borderWidth: 3,
                    pointRadius: 4,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#d4af37', 
                        usePointStyle: true, 
                        padding: 20,
                        font: { family: 'Georgia', size: 12 }
                    } 
                },
                tooltip: {
                    callbacks: {
                        title: (items) => `Cosmic ${items[0].label}`
                    }
                }
            },
            scales: {
                x: { 
                    grid: { display: false }, 
                    ticks: { color: '#888', font: { family: 'Arial' } } 
                },
                y: { 
                    display: false, 
                    min: 0, 
                    max: 110 
                }
            }
        }
    });

    // 그래프 아래 요약 메시지 업데이트
    showEnergySummary(lastData);
}


// 에너지 요약 메시지를 생성하고 화면에 표시하는 함수
function showEnergySummary(lastData) {
    const summaryDiv = document.getElementById('energy-summary');
    if (!summaryDiv || lastData.length === 0) return;

    const last = lastData[lastData.length - 1]; // 가장 최근에 뽑은 데이터
    let message = "";

    // 카테고리별 맞춤 영문 격언 (KIVOSY 스타일)
    const messages = {
        Love: "Your Love energy is peaking! The universe suggests opening your heart to new possibilities today. 💖",
        Success: "Success is within your reach. Your focus and determination are aligning with cosmic timing. 🚀",
        Wealth: "Financial clarity is coming. Trust your instincts regarding investments or new ventures. 💰",
        General: "Your overall cosmic vibration is stable. It's a perfect time for reflection and inner peace. ✨"
    };

    message = messages[last.category] || messages.General;

    // 고급스러운 금색 스타일로 메시지 출력
    summaryDiv.innerHTML = `
        <div style="text-align: center; padding: 15px; margin-bottom: 20px; border-radius: 10px; background: rgba(255,215,0,0.08); border: 1px solid rgba(212, 175, 55, 0.3);">
            <p style="color: var(--gold); font-style: italic; font-size: 1rem; margin: 0; font-family: 'Georgia', serif;">
                "Note: ${message}"
            </p>
        </div>
    `;
}


// 카드 뒷면과 기본 이미지들을 미리 로딩하는 함수 (내일 script.js에 추가 예정)
function preloadImages() {
    const imagesToPreload = [
        'img/tarot/back/back1.webp',
        'img/tarot/back/back2.webp'
    ];
    imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// script.js 맨 아래에 이 한 줄을 추가해야 실제로 작동합니다!
preloadImages();