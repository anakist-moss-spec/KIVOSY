const DailyFortune = {
    // 1. 날짜 식별자 생성
    getToday: () => {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    },

    // 2. 고유 시드 기반 랜덤 인덱스 추출 (결정론적 랜덤)
    getSeedIndex: (category, totalCount) => {
        const today = DailyFortune.getToday();
        const combined = `${today}-${category}`;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = (hash << 5) - hash + combined.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % totalCount;
    },

    // 3. 메인 실행 함수
    handleRequest: (category) => {
        const today = DailyFortune.getToday();
        const storageKey = `kivosy_daily_${category}_${today}`;
        const savedData = localStorage.getItem(storageKey);

        // [잔인한 체크] 이미 뽑았다면 저장된 결과 바로 보여주기
        if (savedData) {
            const card = JSON.parse(savedData);
            alert(`[운명의 기록] 오늘의 ${category} 카드는 이미 결정되었습니다.\n당신의 기록 보관소를 확인하세요.`);
            // 새로 뽑는 애니메이션 없이 바로 결과창으로 이동 시키거나 저장된 결과 표시
            displayResult(card, category, true); 
            return;
        }

        // [운명 결정] 처음 뽑는 거라면 시드 기반으로 카드 추출
        const cardIndex = DailyFortune.getSeedIndex(category, tarotData.length);
        const card = tarotData[cardIndex];

        // 로컬 스토리지 저장 (재방문 확인용)
        localStorage.setItem(storageKey, JSON.stringify(card));

        // 결과 연출 실행
        displayResult(card, category, false);
    }
};

function displayResult(card, category, isAlreadyDrawn) {
    const cardImage = document.getElementById('cardImage');
    const cardInner = document.getElementById('cardInner');
    
    // 1. 카드 이미지 설정
    cardImage.src = card.image; // tarotData에 정의된 이미지 경로
    
    // 2. 카드 뒤집기 애니메이션
    cardInner.classList.add('is-flipped');
    
    // 3. 날짜 도장(Stamp) 추가
    // 이미 도장이 있다면 제거 후 새로 생성
    const oldStamp = document.querySelector('.daily-stamp');
    if (oldStamp) oldStamp.remove();
    
    const stamp = document.createElement('div');
    stamp.className = 'daily-stamp';
    stamp.innerText = `${DailyFortune.getToday()} ${category}`;
    
    // 카드 앞면(card-front)에 도장을 찍음
    document.querySelector('.card-front').appendChild(stamp);
    
    // 4. 이미 뽑았던 카드라면 알림 효과 (선택 사항)
    if (isAlreadyDrawn) {
        console.log("이미 확인한 운명입니다.");
        // 여기서 "오늘의 기록"임을 알리는 작은 텍스트를 화면에 띄울 수 있습니다.
    } else {
        // 처음 뽑는 거라면 축하 효과 (폭죽 등)
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#B8860B'] // 금색 계열
        });
    }
}