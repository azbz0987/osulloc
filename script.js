// ---------- 드래그 슬라이드 캐러셀 (공통) ----------
function initDragSlider(dragZone, track, startInset, viewport = dragZone) {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;
  let translateX = startInset;

  function getMinTranslate() {
    const trackWidth = track.scrollWidth;
    const viewportWidth = viewport.clientWidth;
    return Math.min(startInset, viewportWidth - trackWidth);
  }

  function setTranslate(x) {
    const min = getMinTranslate();
    const clamped = Math.min(startInset, Math.max(x, min));
    translateX = clamped;
    track.style.transform = `translateX(${clamped}px)`;
  }

  function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function onDragStart(e) {
    isDragging = true;
    dragZone.classList.add('isDragging');
    dragStartX = getClientX(e);
    dragStartTranslate = translateX;
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const delta = getClientX(e) - dragStartX;
    setTranslate(dragStartTranslate + delta);
  }

  function onDragEnd() {
    isDragging = false;
    dragZone.classList.remove('isDragging');
  }

  dragZone.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);

  dragZone.addEventListener('touchstart', onDragStart, { passive: true });
  dragZone.addEventListener('touchmove', onDragMove, { passive: true });
  dragZone.addEventListener('touchend', onDragEnd);

  setTranslate(startInset);
}

// 두 번째 컬럼 시작 지점 = 264(여백) + 94(1열) + 24(gutter) — 첫 슬라이드의 기본 위치
initDragSlider(
  document.getElementById('aboutSection'),
  document.getElementById('aboutSlideTrack'),
  382,
  document.getElementById('aboutSlideViewport')
);

// ---------- Jeju 사진 슬라이드 (인디케이터 + 좌우 버튼) ----------
const jejuSlides = document.querySelectorAll('#jejuPhotoWrap .jeju_slide');
const jejuIndicator = document.getElementById('jejuIndicator');
const jejuIndicatorLine = document.getElementById('jejuIndicatorLine');
const jejuIndicatorItems = document.querySelectorAll('#jejuIndicator .jeju_indicatorItem');
let jejuIndex = 0;

function setJejuSlide(index) {
  jejuIndex = (index + jejuSlides.length) % jejuSlides.length;

  jejuSlides.forEach((el, i) => el.classList.toggle('isActive', i === jejuIndex));
  jejuIndicatorItems.forEach((el, i) => el.classList.toggle('isActive', i === jejuIndex));

  const gapIndex = Math.min(jejuIndex, jejuIndicatorItems.length - 2);
  jejuIndicatorItems.forEach((el, i) => el.classList.toggle('expandGap', i === gapIndex));

  const leftRect = jejuIndicatorItems[gapIndex].getBoundingClientRect();
  const rightRect = jejuIndicatorItems[gapIndex + 1].getBoundingClientRect();
  const indicatorRect = jejuIndicator.getBoundingClientRect();
  jejuIndicatorLine.style.left = `${(leftRect.right + rightRect.left) / 2 - indicatorRect.left}px`;
}

jejuIndicatorItems.forEach((item, i) => {
  item.addEventListener('click', () => setJejuSlide(i));
});

document.getElementById('jejuPhotoPrev').addEventListener('click', () => setJejuSlide(jejuIndex - 1));
document.getElementById('jejuPhotoNext').addEventListener('click', () => setJejuSlide(jejuIndex + 1));

setJejuSlide(0);

// ---------- Scroll 인디케이터 + 사진 3단 전환 (섹션 스크롤 진행률 기반) ----------
const scrollSection = document.getElementById('scrollSection');
const scrollThumb = document.getElementById('scrollThumb');
const scrollPhoto1 = document.getElementById('scrollPhoto1');
const scrollPhoto2 = document.getElementById('scrollPhoto2');
const scrollPhoto3 = document.getElementById('scrollPhoto3');
const SCROLL_TRACK_HEIGHT = 660;
const SCROLL_THUMB_SIZE = 60;
const SCROLL_PHOTO1_INSET = 60; // photo1이 처음에 갖고 있는 여백(px), 스크롤에 따라 0으로 줄어듦

function getScrollProgress() {
  const scrollableRange = scrollSection.offsetHeight - window.innerHeight;
  return scrollableRange > 0
    ? Math.min(1, Math.max(0, (window.scrollY - scrollSection.offsetTop) / scrollableRange))
    : 0;
}

function updateScrollThumb(progress) {
  scrollThumb.style.setProperty('--thumb-progress', `${progress * (SCROLL_TRACK_HEIGHT - SCROLL_THUMB_SIZE)}px`);
}

function updateScrollPhotos(progress) {
  const seg = 1 / 3;
  let inset1;
  let opacity1;
  let opacity2;
  let opacity3;

  if (progress <= seg) {
    const local = progress / seg;
    inset1 = SCROLL_PHOTO1_INSET * (1 - local);
    opacity1 = 1;
    opacity2 = 0;
    opacity3 = 0;
  } else if (progress <= seg * 2) {
    const local = (progress - seg) / seg;
    inset1 = 0;
    opacity1 = 1 - local;
    opacity2 = local;
    opacity3 = 0;
  } else {
    const local = (progress - seg * 2) / seg;
    inset1 = 0;
    opacity1 = 0;
    opacity2 = 1 - local;
    opacity3 = local;
  }

  scrollPhoto1.style.setProperty('--photo1-inset', `${inset1}px`);
  scrollPhoto1.style.opacity = opacity1;
  scrollPhoto2.style.opacity = opacity2;
  scrollPhoto3.style.opacity = opacity3;
}

function updateScrollSection() {
  const progress = getScrollProgress();
  updateScrollThumb(progress);
  updateScrollPhotos(progress);
}

window.addEventListener('scroll', updateScrollSection);
window.addEventListener('resize', updateScrollSection);
updateScrollSection();
