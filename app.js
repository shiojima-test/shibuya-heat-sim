// ===== 渋谷ヒートシム v1.3 =====
let wbgtData = null;
let map, markers = {};
let currentIdx = 0;
let playing = false;
let playTimer = null;

// 地図中心：SOIL（渋谷金王第二ビル / 渋谷3-6-14）
const SOIL = { lat: 35.6566, lng: 139.7040, name: 'SOIL（会場）', addr: '渋谷区渋谷3-6-14 渋谷金王第二ビル' };

const COLORS = [
  { max: 21, color: '#2E8EC4', rank: 'ほぼ安全', bg: 'rgba(46,142,196,.12)' },
  { max: 25, color: '#5DADE2', rank: '注意', bg: 'rgba(93,173,226,.12)' },
  { max: 28, color: '#F1C40F', rank: '警戒', bg: 'rgba(241,196,15,.12)' },
  { max: 31, color: '#E88A0A', rank: '厳重警戒', bg: 'rgba(232,138,10,.12)' },
  { max: 99, color: '#C0392B', rank: '危険', bg: 'rgba(192,57,43,.12)' }
];

const ADVICE = {
  'ほぼ安全': '今は快適! 外で元気に遊ぼう',
  '注意': 'スイカバーで水分チャージしよう',
  '警戒': 'のどが渇く前にスイカバーでクールダウン',
  '厳重警戒': '日陰で休憩! スイカバーで体を冷やそう',
  '危険': '外は危険! 涼しい部屋でスイカバーを食べよう'
};

function getWbgtInfo(wbgt) {
  for (const c of COLORS) {
    if (wbgt < c.max) return c;
  }
  return COLORS[COLORS.length - 1];
}

// Initialize map
function initMap() {
  map = L.map('map', { zoomControl: false }).setView([SOIL.lat, SOIL.lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);

  // SOIL venue marker (会場)
  const venueIcon = L.divIcon({
    className: '',
    html: '<div class="venue-pin"><div class="badge">SOIL 会場</div><div class="tip"></div></div>',
    iconSize: [80, 30],
    iconAnchor: [40, 30]
  });
  L.marker([SOIL.lat, SOIL.lng], { icon: venueIcon, zIndexOffset: 1000 })
    .addTo(map)
    .bindPopup(`<div class="popup-title">${SOIL.name}</div><div style="font-size:11px;color:#145A32">${SOIL.addr}</div><div style="margin-top:4px;font-size:11px;font-weight:700;color:#E60012">ロッテ × 東急不動産</div>`, { maxWidth: 220 });
}

// Load data and initialize
async function init() {
  initMap();
  const res = await fetch('data/wbgt_sample.json');
  wbgtData = await res.json();

  // Create markers
  for (const [key, area] of Object.entries(wbgtData.areas)) {
    const m = L.circleMarker([area.lat, area.lng], {
      radius: 10, weight: 2, opacity: 1, fillOpacity: 0.6
    }).addTo(map);
    markers[key] = m;
  }

  // Slider setup
  const slider = document.getElementById('timeSlider');
  slider.max = wbgtData.timeline.length - 1;
  slider.value = 0;
  slider.addEventListener('input', () => {
    currentIdx = parseInt(slider.value);
    updateView();
  });

  // Play button
  document.getElementById('playBtn').addEventListener('click', togglePlay);

  updateView();
}

function updateView() {
  const time = wbgtData.timeline[currentIdx];
  document.getElementById('timeVal').textContent = time;
  document.getElementById('timeSlider').value = currentIdx;

  let maxWbgt = -Infinity, maxArea = '';

  for (const [key, area] of Object.entries(wbgtData.areas)) {
    const d = area.data[currentIdx];
    const info = getWbgtInfo(d.wbgt);

    // Update marker
    markers[key].setStyle({
      color: info.color, fillColor: info.color,
      radius: Math.max(8, d.wbgt * 1.5)
    });

    // Popup content
    markers[key].unbindPopup();
    markers[key].bindPopup(`
      <div class="popup-title">${area.name}</div>
      <div class="popup-wbgt" style="color:${info.color}">${d.wbgt.toFixed(1)} <span style="font-size:12px">℃</span></div>
      <div style="font-size:11px;color:${info.color};font-weight:700;margin-bottom:6px">${info.rank}</div>
      <div class="popup-row"><span>気温</span><span>${d.temp.toFixed(1)}℃</span></div>
      <div class="popup-row"><span>湿度</span><span>${d.humidity}%</span></div>
      <div style="margin-top:6px;font-size:11px;color:#145A32;font-weight:700">🍉 ${ADVICE[info.rank]}</div>
    `, { maxWidth: 220 });

    if (d.wbgt > maxWbgt) {
      maxWbgt = d.wbgt;
      maxArea = area.name;
    }
  }

  // Sidebar update
  const info = getWbgtInfo(maxWbgt);
  document.getElementById('wbgtVal').textContent = maxWbgt.toFixed(1);
  document.getElementById('wbgtVal').style.color = info.color;
  document.getElementById('wbgtRank').textContent = info.rank;
  document.getElementById('wbgtRank').style.color = info.color;
  document.getElementById('dangerArea').textContent = maxWbgt >= 28 ? `⚠ ${maxArea}が${info.rank}!` : `${maxArea}が最高`;
  document.getElementById('advice').textContent = '🍉 ' + ADVICE[info.rank];
  document.getElementById('sideTime').textContent = time;
}

function togglePlay() {
  const btn = document.getElementById('playBtn');
  if (playing) {
    playing = false;
    clearInterval(playTimer);
    btn.textContent = '▶ 再生';
    btn.classList.remove('pause');
  } else {
    playing = true;
    btn.textContent = '⏸ 一時停止';
    btn.classList.add('pause');
    playTimer = setInterval(() => {
      currentIdx++;
      if (currentIdx >= wbgtData.timeline.length) {
        currentIdx = 0;
      }
      updateView();
    }, 800);
  }
}

document.addEventListener('DOMContentLoaded', init);
