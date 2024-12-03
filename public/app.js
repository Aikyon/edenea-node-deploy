
//メイン画像のスライドショー

document.addEventListener('DOMContentLoaded', function() {
  const myImages = document.querySelectorAll(".MV img");

  // 画像が存在しない場合はスライドショーを実行しない
  if (myImages.length === 0) {
    console.error("No images found in the .MV container.");
    return; // 画像がない場合は処理を中断
  }

  let currentIndex = 0;

  function slideShow() {
    // 現在の画像から "current" クラスを削除
    myImages[currentIndex].classList.remove("current");

    // インデックスを進める
    currentIndex++;

    // インデックスが画像数を超えたら最初に戻る
    if (currentIndex >= myImages.length) {
      currentIndex = 0;
    }

    // 次の画像に "current" クラスを追加
    myImages[currentIndex].classList.add("current");
  }

  // 5秒ごとにスライドショーを切り替える
  setInterval(slideShow, 5000);
});

/* const myImages = document.querySelectorAll(".MV img");

let currentIndex = 0;

function slideShow() {
  myImages[currentIndex].classList.remove("current");

  currentIndex++;

  if(currentIndex > myImages.length - 1) {
    currentIndex = 0;
  }
  myImages[currentIndex].classList.add("current");
}

setInterval(slideShow, 5000);*/




//ハンバーガーメニューアニメーション
const menuBtn = document.querySelector(".burger");
const overlayBox = document.querySelector(".nav-links2");
const menuLine = document.querySelector(".menu-line");

menuBtn.addEventListener("click", () => {
overlayBox.classList.toggle("show");
menuLine.classList.toggle("active");
});












// line-animation
document.addEventListener('DOMContentLoaded', function() {
  // Intersection Observerの設定
  const observerOptions = {
    threshold: 0.5 // 要素の50%が表示されたときにトリガー
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // アニメーションを開始するクラスを追加
        entry.target.classList.add('animate');
        // 一度アニメーションを実行した後は監視を停止
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // すべてのline要素を監視対象として追加
  document.querySelectorAll('.line').forEach(line => {
    observer.observe(line);
  });
});



// about edeneaのアニメーション（パララックス効果）
/*const myPic01 = document.querySelector(".pic01");

new simpleParallax(myPic01);*/





// edeneaのこだわりアニメーション

document.addEventListener("DOMContentLoaded", function () {
  const objects = document.querySelectorAll('.object');
  
  const observerOptions = {
    root: null, // ビューポートをコンテナとして使用
    rootMargin: '0px',
    threshold: 0.5 // オブジェクトが50%表示されたときにアニメーションをトリガー
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 要素がビューポートに入ったときにフェードイン
        entry.target.style.opacity = 1;
        entry.target.style.transition = 'opacity 1s ease-in-out';
        
        // アニメーションを一度実行したら監視を停止
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  objects.forEach(object => {
    observer.observe(object);
  });
});



