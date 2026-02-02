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

async function drawCard() {
    const inner = document.getElementById('cardInner');
    const questionInput = document.getElementById('question');
    const loader = document.getElementById('kivosyLoader');
    const loaderMsg = document.getElementById('loaderMessage');
    
    let matchedSection = null; 

    if (inner.classList.contains('flipped')) return;

    // [1] 클릭 소리 추가 (함수 시작하자마자 재생!) ---------------------------
    const clickSound = document.getElementById('sound-click');
    if (clickSound) clickSound.play();
    // -----------------------------------------------------------------

    const isQuestionEmpty = questionInput.value.trim() === "";

    try {
        loader.style.display = 'block';
        inner.classList.add('shaking');
        
        loaderMsg.innerText = isQuestionEmpty 
            ? "KIVOSY is reading your energy for the day..." 
            : "Searching for answers to your question...";

        await new Promise(resolve => setTimeout(resolve, 2000));

        const randomIndex = Math.floor(Math.random() * 22);
        const cardData = tarotData[randomIndex];
        const aiNames = Object.keys(cardData.interpretations);
        const randomAI = aiNames[Math.floor(Math.random() * aiNames.length)];
        const selectedReply = cardData.interpretations[randomAI];

        const question = questionInput.value.toLowerCase();
        let finalHTML = "";

        if (!isQuestionEmpty) {
            for (const [section, keywords] of Object.entries(categories)) {
                if (keywords.some(kw => question.includes(kw))) {
                    matchedSection = section; 
                    break;
                }
            }
            finalHTML = matchedSection 
                ? extractSectionHTML(selectedReply, matchedSection)
                : `<div class="full-text">${selectedReply.replace(/\n/g, '<br><br>')}</div>`;
        } else {
            finalHTML = `
                <div class="section-title">✨ Today's General Energy ✨</div>
                <div class="full-text">${selectedReply.replace(/\n/g, '<br><br>')}</div>
                <div class="detail-text" style="color: var(--gold); border: 1px dashed var(--gold); padding: 10px; margin-top: 20px;">
                    💡 <b>Tip:</b> Enter a specific question like "Will I find love?" or "Should I invest?" for a more precise interpretation.
                </div>
            `;
        }

        document.getElementById('cardImage').src = `img/tarot/gold/${cardData.img}.png`;
        document.getElementById('answerText').innerText = cardData.ans;
        document.getElementById('cardName').innerText = cardData.name;
        document.getElementById('aiSource').innerText = `— Interpretation by ${randomAI} —`;
        document.getElementById('descText').innerHTML = finalHTML;

        if (loader) loader.style.display = 'none';
        inner.classList.remove('shaking');

        // [2] 카드 뒤집히는 소리 추가 (뒤집기 애니메이션 직전!) -------------------
        const flipSound = document.getElementById('sound-flip');
        if (flipSound) flipSound.play();
        // -----------------------------------------------------------------

        inner.classList.add('flipped');
        inner.classList.add('flash-effect'); 

        // ✨ 바로 여기! 카드가 뒤집히는 순간 금가루를 터뜨립니다.
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#d4af37', '#f9f295', '#ffffff'] 
        });

        setTimeout(() => {
            inner.classList.remove('flash-effect');
        }, 600);

        setTimeout(() => {
            const resultArea = document.getElementById('resultArea');
            if (resultArea) {
                resultArea.style.display = 'block';
                window.scrollTo({ top: resultArea.offsetTop - 500, behavior: 'smooth' });
            }
        }, 800);

        const historyEntry = {
            date: new Date().toISOString(), 
            question: questionInput.value || "General Reading",
            cardName: cardData.name,
            cardImg: cardData.img,
            category: matchedSection || "General" 
        };

        let tarotHistory = JSON.parse(localStorage.getItem('tarotHistory') || '[]');
        tarotHistory.push(historyEntry);
        if (tarotHistory.length > 50) tarotHistory.shift();
        localStorage.setItem('tarotHistory', JSON.stringify(tarotHistory));

    } catch (error) {
        console.error("Error during execution:", error);
        if (loader) loader.style.display = 'none';
        inner.classList.remove('shaking');
    }
}

// Function to extract specific interpretation sections
function extractSectionHTML(fullText, sectionType) {
    const cleanText = fullText.replace(/[#*\[\]]/g, '');
    const splitText = cleanText.replace(/([.;:!])\s+/g, "$1\n");
    const lines = splitText.split('\n');
    let result = [];
    let found = false;
    
    // Keywords updated to English
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
    document.getElementById('cardInner').classList.remove('flipped');
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('question').value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setQuestion(text) {
    const qInput = document.getElementById('question');
    if (qInput) {
        qInput.value = text;
        // 버튼 누르면 바로 카드 뽑기 화면으로 시선 집중!
        qInput.focus();
    }
}

function saveCardImage() {
    // [최종 확정 브랜드]
    const brandName = "KIVOSY"; 
    const fullDomain = "kivosy.pages.dev";


    const img = document.getElementById('cardImage');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const tempImg = new Image();
    tempImg.crossOrigin = "anonymous"; 
    tempImg.src = img.src + "?t=" + new Date().getTime();

    tempImg.onload = function() {
        // --- [수치 조절 구역] ---
        const imageScale = 1.1; // 👈 1보다 작게 하면 카드가 작아집니다 (0.8 = 80% 크기)
        const canvasPadding = 100; // 좌우 여백
        
        // 카드 크기 계산
        const drawWidth = tempImg.naturalWidth * imageScale;
        const drawHeight = tempImg.naturalHeight * imageScale;
        
        // 캔버스 크기 결정 (카드 너비에 여백을 더함)
        canvas.width = drawWidth + (canvasPadding * 2);
        canvas.height = drawHeight + 350; // 아래 텍스트 공간 넉넉히

        // 1. 배경 칠하기
        ctx.fillStyle = "#0a0a0c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. 카드 그리기 (중앙 정렬)
        const imgX = (canvas.width - drawWidth) / 2;
        const imgY = 50; // 위쪽 여백
        ctx.drawImage(tempImg, imgX, imgY, drawWidth, drawHeight);

        // 3. 결과 텍스트 (YES/NO) - 폰트 크기 여기서 조절!
        ctx.fillStyle = "#f9f295";
        ctx.font = "bold 140px Georgia"; // 👈 엄청 크게 키웠습니다!
        ctx.textAlign = "center";
        ctx.fillText(document.getElementById('answerText').innerText, canvas.width / 2, imgY + drawHeight + 120);

        // 4. 카드 이름 - 폰트 크기 조절
        ctx.fillStyle = "#d4af37";
        ctx.font = "italic 70px Georgia"; // 👈 이것도 키웠습니다!
        ctx.fillText(document.getElementById('cardName').innerText, canvas.width / 2, imgY + drawHeight + 190);

        // 5. 사이트 주소 (워터마크)
        ctx.fillStyle = "rgba(212, 175, 55, 0.5)";
        ctx.font = "50px Arial";
        ctx.fillText("kivosy.pages.dev", canvas.width / 2, canvas.height - 50);

        // 6. 다운로드
        const link = document.createElement('a');
        link.download = `Kivosy-Tarot.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        // ✨ 금가루 축하포!
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#F9F295', '#D4AF37']
        });
    };
}