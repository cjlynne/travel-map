/**
 * 中国旅行足迹地图 - 三栏布局版
 */

let map;
let currentMode = 'visited';
let selectedUser = null;
let mergeUsers = [];
let provinceLayer = null;
let citiesData = null;
let selectedProvince = null;
let cityMarkers = {};
let cityLabels = {};
let showLabelsEnabled = true;
let showMarkersEnabled = true;

const fullNameToShort = {
  '北京市': '北京', '天津市': '天津', '河北省': '河北', '山西省': '山西',
  '内蒙古自治区': '内蒙古', '辽宁省': '辽宁', '吉林省': '吉林', '黑龙江省': '黑龙江',
  '上海市': '上海', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
  '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
  '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '广西壮族自治区': '广西',
  '海南省': '海南', '重庆市': '重庆', '四川省': '四川', '贵州省': '贵州',
  '云南省': '云南', '西藏自治区': '西藏', '陕西省': '陕西', '甘肃省': '甘肃',
  '青海省': '青海', '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
  '台湾省': '台湾', '香港特别行政区': '香港', '澳门特别行政区': '澳门'
};

const provinceCenters = {
  '北京市': [116.405285, 39.904989], '天津市': [117.190182, 39.125596],
  '河北省': [114.489778, 38.045123], '山西省': [112.549248, 37.857014],
  '内蒙古自治区': [111.670801, 40.818311], '辽宁省': [123.429096, 41.796767],
  '吉林省': [125.324521, 43.886841], '黑龙江省': [126.642464, 45.756967],
  '上海市': [121.472644, 31.231706], '江苏省': [118.767413, 32.041544],
  '浙江省': [120.153576, 30.287459], '安徽省': [117.283042, 31.86119],
  '福建省': [119.306239, 26.075302], '江西省': [115.892151, 28.676493],
  '山东省': [117.000923, 36.675807], '河南省': [113.665412, 34.757975],
  '湖北省': [114.298572, 30.584355], '湖南省': [112.982279, 28.19409],
  '广东省': [113.280637, 23.125178], '广西壮族自治区': [108.320004, 22.824078],
  '海南省': [110.35004, 19.022071], '重庆市': [106.504962, 29.533155],
  '四川省': [104.065735, 30.659462], '贵州省': [106.713478, 26.578343],
  '云南省': [102.712251, 25.040609], '西藏自治区': [91.132212, 29.660009],
  '陕西省': [108.948024, 34.263161], '甘肃省': [103.823557, 36.058055],
  '青海省': [101.778228, 36.623178], '宁夏回族自治区': [106.27822, 38.46637],
  '新疆维吾尔自治区': [87.617733, 43.792818], '台湾省': [121.509064, 25.044207],
  '香港特别行政区': [114.173355, 22.320048], '澳门特别行政区': [113.543877, 22.198745]
};

// 初始化
async function initApp() {
  console.log('应用开始初始化...');
  initMap();
  loadUserList();
  await loadData();
  updateStats();
  console.log('应用初始化完成');

  // 添加地图点击测试
  map.on('click', function(e) {
    console.log('地图被点击，坐标:', e.latlng);
  });
}

function initMap() {
  map = L.map('map', {
    center: [35.8617, 104.1954],
    zoom: 5,
    minZoom: 3,
    maxZoom: 12
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  addLegend();
}

async function loadData() {
  try {
    const mapRes = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');
    const provincesData = await mapRes.json();

    provinceLayer = L.geoJSON(provincesData, {
      style: styleFeature,
      onEachFeature: onEachFeature
    }).addTo(map);

    addProvinceLabels();
    map.fitBounds(provinceLayer.getBounds());

    const citiesRes = await fetch('data/cities.json');
    citiesData = await citiesRes.json();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
}

// 添加省份名称标签（不阻止点击事件）
function addProvinceLabels() {
  for (const [fullName, center] of Object.entries(provinceCenters)) {
    const shortName = fullNameToShort[fullName];
    if (!shortName) continue;

    L.marker(center, {
      interactive: false,  // 禁止交互，让点击事件穿透到省份
      icon: L.divIcon({
        className: 'province-label',
        html: `<div class="province-label" style="pointer-events:none">${shortName}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      })
    }).addTo(map);
  }
}

// 省份样式
function styleFeature(feature) {
  const shortName = fullNameToShort[feature.properties.name] || feature.properties.name;
  let fillColor = '#E0E0E0';
  let fillOpacity = 0.7;

  if (selectedUser) {
    if (selectedUser.visited.includes(shortName)) {
      fillColor = selectedUser.color;
      fillOpacity = 0.8;
    } else if (selectedUser.wishlist.includes(shortName)) {
      fillColor = '#F39C12';
      fillOpacity = 0.7;
    }
  } else if (mergeUsers.length === 2) {
    const u1 = mergeUsers[0].visited.includes(shortName);
    const u2 = mergeUsers[1].visited.includes(shortName);
    const w1 = mergeUsers[0].wishlist.includes(shortName);
    const w2 = mergeUsers[1].wishlist.includes(shortName);

    if (u1 && u2) { fillColor = '#9B59B6'; fillOpacity = 0.8; } // 两人都去过 - 紫色
    else if (u1) { fillColor = mergeUsers[0].color; fillOpacity = 0.8; } // 用户1去过
    else if (u2) { fillColor = mergeUsers[1].color; fillOpacity = 0.8; } // 用户2去过
    else if (w1 || w2) { fillColor = '#F39C12'; fillOpacity = 0.7; } // 有人想去 - 黄色
  }

  return { fillColor, weight: 2, opacity: 1, color: 'white', fillOpacity };
}

// 省份事件
function onEachFeature(feature, layer) {
  const shortName = fullNameToShort[feature.properties.name] || feature.properties.name;

  // 保存原始样式
  layer.originalStyle = {
    fillColor: '#E0E0E0',
    weight: 2,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7
  };

  // 鼠标悬停效果
  layer.on('mouseover', function(e) {
    this.setStyle({ weight: 3, color: '#333', fillOpacity: 0.85 });
    this.bringToFront();
  });

  // 鼠标移出 - 恢复原始样式
  layer.on('mouseout', function(e) {
    // 重新应用基于状态的样式
    const style = styleFeature(feature);
    this.setStyle(style);
  });

  // 点击事件 - 选择省份并切换状态
  layer.on('click', function(e) {
    console.log('点击了省份:', shortName);
    selectProvince(shortName);

    // 如果有选中用户，直接切换省份状态
    if (selectedUser) {
      toggleProvince(shortName);
    }
  });
}

// 切换省份状态
function toggleProvince(provinceName) {
  if (!selectedUser) {
    alert('请先在左侧选择一个用户');
    return;
  }

  const visitedIdx = selectedUser.visited.indexOf(provinceName);
  const wishlistIdx = selectedUser.wishlist.indexOf(provinceName);

  if (currentMode === 'visited') {
    // 去过模式
    if (visitedIdx > -1) {
      // 已经是"去过"，取消
      selectedUser.visited.splice(visitedIdx, 1);
    } else {
      // 添加到"去过"
      selectedUser.visited.push(provinceName);
      // 从"想去"中移除
      if (wishlistIdx > -1) {
        selectedUser.wishlist.splice(wishlistIdx, 1);
      }
    }
  } else {
    // 想去模式
    if (wishlistIdx > -1) {
      // 已经是"想去"，取消
      selectedUser.wishlist.splice(wishlistIdx, 1);
    } else {
      // 添加到"想去"
      selectedUser.wishlist.push(provinceName);
      // 从"去过"中移除
      if (visitedIdx > -1) {
        selectedUser.visited.splice(visitedIdx, 1);
      }
    }
  }

  // 保存数据
  Storage.updateUser(selectedUser.id, {
    visited: selectedUser.visited,
    wishlist: selectedUser.wishlist
  });

  // 更新地图样式
  provinceLayer.setStyle(styleFeature);

  // 更新统计
  updateStats();

  // 更新右侧城市列表
  if (selectedProvince === provinceName) {
    showCitySidebar();
  }
}

// 选择省份
function selectProvince(provinceName) {
  console.log('selectProvince被调用:', provinceName);
  selectedProvince = provinceName;

  // 更新显示
  document.getElementById('currentProvince').textContent = provinceName;

  // 显示右侧城市列表
  showCitySidebar();
}

// 显示城市侧边栏
function showCitySidebar() {
  console.log('showCitySidebar被调用，selectedProvince:', selectedProvince);

  if (!selectedProvince || !citiesData) {
    console.log('没有选择省份或没有城市数据');
    return;
  }

  // 将简称转换为全名来查找城市数据
  let fullName = selectedProvince;
  for (const [full, short] of Object.entries(fullNameToShort)) {
    if (short === selectedProvince) {
      fullName = full;
      break;
    }
  }

  console.log('查找城市数据，全名:', fullName);

  const cities = citiesData[fullName];
  if (!cities || cities.length === 0) {
    console.log('该省份没有城市数据');
    document.getElementById('cityList').innerHTML = '<div class="empty-hint">该省份暂无城市数据</div>';
    document.getElementById('rightPanel').classList.remove('hidden');
    return;
  }

  console.log('显示', cities.length, '个城市');

  document.getElementById('cityTitle').textContent = selectedProvince;
  const cityList = document.getElementById('cityList');
  cityList.innerHTML = '';

  cities.forEach(city => {
    const item = document.createElement('div');
    item.className = 'city-item';

    const cityKey = `${selectedProvince}_${city.name}`;
    let isVisited = false;
    let isWishlist = false;

    if (selectedUser) {
      isVisited = selectedUser.visitedCities && selectedUser.visitedCities.includes(cityKey);
      isWishlist = selectedUser.wishlistCities && selectedUser.wishlistCities.includes(cityKey);
    }

    if (isVisited) item.classList.add('visited');
    if (isWishlist) item.classList.add('wishlist');

    item.innerHTML = `
      <span class="city-status">${isVisited ? '✓' : (isWishlist ? '★' : '○')}</span>
      <span class="city-name">${city.name}</span>
    `;

    item.onclick = () => toggleCity(city, selectedProvince);
    cityList.appendChild(item);
  });

  document.getElementById('rightPanel').classList.remove('hidden');
  showCityMarkers();
}

function closeSidebar() {
  document.getElementById('rightPanel').classList.add('hidden');
}

// 切换城市状态
function toggleCity(city, province) {
  if (!selectedUser) {
    alert('请先在左侧选择或添加用户');
    return;
  }

  const cityKey = `${province}_${city.name}`;
  if (!selectedUser.visitedCities) selectedUser.visitedCities = [];
  if (!selectedUser.wishlistCities) selectedUser.wishlistCities = [];

  if (currentMode === 'visited') {
    const idx = selectedUser.visitedCities.indexOf(cityKey);
    if (idx > -1) {
      selectedUser.visitedCities.splice(idx, 1);
    } else {
      selectedUser.visitedCities.push(cityKey);
      const wishIdx = selectedUser.wishlistCities.indexOf(cityKey);
      if (wishIdx > -1) selectedUser.wishlistCities.splice(wishIdx, 1);
    }
  } else {
    const idx = selectedUser.wishlistCities.indexOf(cityKey);
    if (idx > -1) {
      selectedUser.wishlistCities.splice(idx, 1);
    } else {
      selectedUser.wishlistCities.push(cityKey);
      const visitIdx = selectedUser.visitedCities.indexOf(cityKey);
      if (visitIdx > -1) selectedUser.visitedCities.splice(visitIdx, 1);
    }
  }

  // 保存数据
  Storage.updateUser(selectedUser.id, {
    visitedCities: selectedUser.visitedCities,
    wishlistCities: selectedUser.wishlistCities
  });

  // 刷新selectedUser对象
  selectedUser = Storage.getUser(selectedUser.id);

  syncProvinceFromCities(province);
  showCitySidebar();
  updateStats();
}

// 显示城市标记 - 显示所有标记过的城市
function showCityMarkers() {
  hideCityMarkers();
  if (!citiesData) return;

  // 只有启用了显示城市才创建
  if (!showMarkersEnabled) return;

  // 遍历所有省份，显示所有标记过的城市
  for (const [fullName, cities] of Object.entries(citiesData)) {
    // 将全名转换为简称
    let shortName = fullName;
    for (const [full, short] of Object.entries(fullNameToShort)) {
      if (full === fullName) {
        shortName = short;
        break;
      }
    }

    cities.forEach(city => {
      const cityKey = `${shortName}_${city.name}`;
      let color = null;
      let radius = 8;

      if (selectedUser) {
        // 单用户模式
        const isVisited = selectedUser.visitedCities && selectedUser.visitedCities.includes(cityKey);
        const isWishlist = selectedUser.wishlistCities && selectedUser.wishlistCities.includes(cityKey);

        if (isVisited) {
          color = getDarkerColor(selectedUser.color);
          radius = 10;
        }
        else if (isWishlist) {
          color = '#F39C12';
          radius = 9;
        }
      } else if (mergeUsers.length === 2) {
        // 合并模式
        const u1v = mergeUsers[0].visitedCities && mergeUsers[0].visitedCities.includes(cityKey);
        const u2v = mergeUsers[1].visitedCities && mergeUsers[1].visitedCities.includes(cityKey);
        const u1w = mergeUsers[0].wishlistCities && mergeUsers[0].wishlistCities.includes(cityKey);
        const u2w = mergeUsers[1].wishlistCities && mergeUsers[1].wishlistCities.includes(cityKey);

        if (u1v && u2v) { color = '#9B59B6'; radius = 11; } // 两人都去过 - 紫色
        else if (u1v) { color = getDarkerColor(mergeUsers[0].color); radius = 10; } // user1去过
        else if (u2v) { color = getDarkerColor(mergeUsers[1].color); radius = 10; } // user2去过
        else if (u1w || u2w) { color = '#F39C12'; radius = 9; } // 有人想去 - 黄色
      }

      // 只有被标记的城市才显示圆圈
      if (color === null) return;

      // 创建城市圆圈 - 随缩放变化
      const zoom = map.getZoom();
      const scale = Math.pow(1.3, zoom - 5);
      const scaledRadius = Math.max(2, Math.min(20, radius * scale * 0.8));

      const marker = L.marker([city.lat, city.lng], {
        icon: L.divIcon({
          className: 'city-marker',
          html: `<div style="
            width: ${scaledRadius * 2}px;
            height: ${scaledRadius * 2}px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [scaledRadius * 2, scaledRadius * 2],
          iconAnchor: [scaledRadius, scaledRadius]
        }),
        interactive: true,
        zIndexOffset: 1000
      }).addTo(map);

      // 点击事件
      marker.on('click', function() {
        if (selectedUser) {
          toggleCity(city, shortName);
        }
      });

      cityMarkers[cityKey] = marker;

      // 添加城市名称标签
      if (showLabelsEnabled) {
        const label = L.marker([city.lat, city.lng], {
          interactive: false,
          icon: L.divIcon({
            className: 'city-label',
            html: `<div class="city-label" style="pointer-events:none">${city.name}</div>`,
            iconSize: [0, 0],
            iconAnchor: [-8, 8]
          })
        }).addTo(map);
        cityLabels[cityKey] = label;
      }
    });
  }
}

function hideCityMarkers() {
  Object.values(cityMarkers).forEach(m => map.removeLayer(m));
  Object.values(cityLabels).forEach(l => map.removeLayer(l));
  cityMarkers = {};
  cityLabels = {};
}

// 同步省份状态 - 只在所有城市都被标记时更新省份
function syncProvinceFromCities(provinceName) {
  if (!selectedUser || !citiesData) return;

  // 将简称转换为全名来查找城市数据
  let fullName = provinceName;
  for (const [full, short] of Object.entries(fullNameToShort)) {
    if (short === provinceName) {
      fullName = full;
      break;
    }
  }

  const cities = citiesData[fullName];
  if (!cities || cities.length === 0) return;

  let visitedCount = 0;
  let wishlistCount = 0;

  cities.forEach(city => {
    const cityKey = `${provinceName}_${city.name}`;
    if (selectedUser.visitedCities && selectedUser.visitedCities.includes(cityKey)) visitedCount++;
    if (selectedUser.wishlistCities && selectedUser.wishlistCities.includes(cityKey)) wishlistCount++;
  });

  const total = cities.length;
  const provIdx = selectedUser.visited.indexOf(provinceName);
  const wishIdx = selectedUser.wishlist.indexOf(provinceName);

  // 只在所有城市都被标记时才自动更新省份状态
  // 否则保留省份的当前状态（用户手动标记的）
  if (visitedCount === total) {
    // 所有城市都去过，省份标记为去过
    if (provIdx === -1) selectedUser.visited.push(provinceName);
    if (wishIdx > -1) selectedUser.wishlist.splice(wishIdx, 1);
  }
  // 注意：不再自动移除省份状态，保留用户手动标记的省份

  Storage.updateUser(selectedUser.id, {
    visited: selectedUser.visited,
    wishlist: selectedUser.wishlist
  });

  provinceLayer.setStyle(styleFeature);
}

// 图例
function addLegend() {
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'legend');
    div.id = 'legend';
    updateLegendContent(div);
    return div;
  };
  legend.addTo(map);
}

// 更新图例内容
function updateLegend() {
  const legend = document.getElementById('legend');
  if (legend) {
    updateLegendContent(legend);
  }
}

function updateLegendContent(div) {
  let html = '<h4>图例</h4>';

  if (selectedUser) {
    // 单用户模式
    html += `<div class="legend-item"><div class="legend-color" style="background:#E0E0E0"></div><span>未标记</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:${selectedUser.color}"></div><span>去过</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:#F39C12"></div><span>想去</span></div>`;
  } else if (mergeUsers.length === 2) {
    // 合并模式
    html += `<div class="legend-item"><div class="legend-color" style="background:#E0E0E0"></div><span>未标记</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:${mergeUsers[0].color}"></div><span>${mergeUsers[0].name}去过</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:${mergeUsers[1].color}"></div><span>${mergeUsers[1].name}去过</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:#9B59B6"></div><span>两人都去过</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:#F39C12"></div><span>有人想去</span></div>`;
  } else {
    // 默认
    html += `<div class="legend-item"><div class="legend-color" style="background:#E0E0E0"></div><span>未标记</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:#FF6B6B"></div><span>去过</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background:#F39C12"></div><span>想去</span></div>`;
  }

  div.innerHTML = html;
}

// 用户管理
function loadUserList() {
  const list = document.getElementById('userList');
  const users = Storage.getUsers();
  list.innerHTML = '';

  users.forEach(user => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.style.borderColor = user.color;
    item.dataset.userId = user.id;

    if (selectedUser && selectedUser.id === user.id) {
      item.classList.add('active');
      item.style.backgroundColor = user.color;
    }

    item.innerHTML = `
      <span class="name" ondblclick="event.stopPropagation();showEditUserModal(${user.id})" title="双击修改名字">${user.name}</span>
      <span class="del" onclick="event.stopPropagation();deleteUser(${user.id})">×</span>
    `;
    item.onclick = () => selectUser(user.id);
    list.appendChild(item);
  });
}

function selectUser(userId) {
  selectedUser = Storage.getUser(userId);
  if (!selectedUser.visitedCities) selectedUser.visitedCities = [];
  if (!selectedUser.wishlistCities) selectedUser.wishlistCities = [];

  mergeUsers = [];

  document.querySelectorAll('.user-item').forEach(item => {
    const user = Storage.getUser(parseInt(item.dataset.userId));
    item.classList.remove('active');
    if (user) item.style.backgroundColor = 'white';
  });

  const item = document.querySelector(`.user-item[data-user-id="${userId}"]`);
  if (item) {
    item.classList.add('active');
    item.style.backgroundColor = selectedUser.color;
  }

  if (provinceLayer) provinceLayer.setStyle(styleFeature);
  showCityMarkers();
  updateStats();
  updateLegend();
}

function deleteUser(userId) {
  if (!confirm('确定删除？')) return;
  Storage.deleteUser(userId);
  if (selectedUser && selectedUser.id === userId) {
    const users = Storage.getUsers();
    if (users.length > 0) selectUser(users[0].id);
    else selectedUser = null;
  }
  loadUserList();
  updateStats();
}

// 编辑用户
let editingUserId = null;

function showEditUserModal(userId) {
  editingUserId = userId;
  const user = Storage.getUser(userId);
  if (!user) return;
  document.getElementById('editUserName').value = user.name;
  document.getElementById('editUserModal').classList.add('show');
  document.getElementById('editUserName').focus();
}

function hideEditUserModal() {
  document.getElementById('editUserModal').classList.remove('show');
  editingUserId = null;
}

function confirmEditUser() {
  const newName = document.getElementById('editUserName').value.trim();
  if (!newName) { alert('请输入用户名'); return; }

  const users = Storage.getUsers();
  const existing = users.find(u => u.name === newName && u.id !== editingUserId);
  if (existing) { alert('用户名已存在'); return; }

  if (Storage.updateUser(editingUserId, { name: newName })) {
    hideEditUserModal();
    // 如果编辑的是当前选中的用户，更新selectedUser
    if (selectedUser && selectedUser.id === editingUserId) {
      selectedUser.name = newName;
    }
    // 如果编辑的是合并模式中的用户，更新mergeUsers
    mergeUsers = mergeUsers.map(u => u.id === editingUserId ? { ...u, name: newName } : u);
    loadUserList();
    updateLegend();
  }
}

// 模式切换
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) btn.classList.add('active');
  });
}

// 切换名称显示
function toggleLabels() {
  const checkbox = document.getElementById('showLabels');
  showLabelsEnabled = checkbox.checked;
  console.log('toggleLabels被调用, showLabelsEnabled:', showLabelsEnabled);

  // 如果有选中的省份，重新显示城市标记
  if (selectedProvince) {
    showCityMarkers();
  }
}

// 切换圆圈显示
function toggleMarkers() {
  const checkbox = document.getElementById('showMarkers');
  showMarkersEnabled = checkbox.checked;
  console.log('toggleMarkers被调用, showMarkersEnabled:', showMarkersEnabled);

  // 重新显示城市标记（会根据showMarkersEnabled决定是否显示）
  showCityMarkers();
}

// 获取深色同色系颜色
function getDarkerColor(color, factor = 0.7) {
  // 简单的颜色加深
  if (color === '#FF6B6B') return '#CC3333';
  if (color === '#4ECDC4') return '#2EADA4';
  if (color === '#9B59B6') return '#7B3996';
  if (color === '#F39C12') return '#D38000';
  if (color === '#1ABC9C') return '#0E9B7E';
  if (color === '#E74C3C') return '#C0392B';
  return color;
}

// 添加用户
function showAddUserModal() {
  document.getElementById('addUserModal').classList.add('show');
  document.getElementById('newUserName').value = '';
  document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
  document.querySelector('.color-option').classList.add('selected');
}

function hideAddUserModal() {
  document.getElementById('addUserModal').classList.remove('show');
}

function addUser() {
  const name = document.getElementById('newUserName').value.trim();
  const colorEl = document.querySelector('.color-option.selected');
  if (!name) { alert('请输入用户名'); return; }
  if (!colorEl) { alert('请选择颜色'); return; }

  const users = Storage.getUsers();
  if (users.some(u => u.name === name)) { alert('用户名已存在'); return; }

  const newUser = {
    id: Storage.generateId(),
    name, color: colorEl.dataset.color,
    visited: [], wishlist: [],
    visitedCities: [], wishlistCities: [],
    createdAt: new Date().toISOString()
  };

  if (Storage.addUser(newUser)) {
    hideAddUserModal();
    loadUserList();
    selectUser(newUser.id);
  }
}

// 合并模式
function showMergeModal() {
  const users = Storage.getUsers();
  if (users.length < 2) { alert('需要至少两个用户'); return; }

  mergeUsers = [];
  const list = document.getElementById('mergeUserList');
  list.innerHTML = '';

  users.forEach(user => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:10px;margin:6px 0;border:2px solid #ddd;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:10px';
    item.dataset.userId = user.id;
    item.innerHTML = `
      <div style="width:18px;height:18px;border-radius:50%;background:${user.color}"></div>
      <span>${user.name}</span>
    `;
    item.onclick = () => {
      if (item.classList.contains('selected')) {
        item.classList.remove('selected');
        item.style.borderColor = '#ddd';
        mergeUsers = mergeUsers.filter(u => u.id !== user.id);
      } else {
        if (mergeUsers.length >= 2) { alert('最多选两个'); return; }
        item.classList.add('selected');
        item.style.borderColor = '#667eea';
        mergeUsers.push(user);
      }
    };
    list.appendChild(item);
  });

  document.getElementById('mergeModal').classList.add('show');
}

function hideMergeModal() {
  document.getElementById('mergeModal').classList.remove('show');
}

function confirmMerge() {
  if (mergeUsers.length !== 2) { alert('请选择两个用户'); return; }
  selectedUser = null;
  hideMergeModal();
  loadUserList();
  if (provinceLayer) provinceLayer.setStyle(styleFeature);
  showCityMarkers();
  updateStats();
  updateLegend();
}

// 统计
function updateStats() {
  const totalProvinces = 34;
  let totalCities = 0;
  for (const cities of Object.values(citiesData || {})) {
    totalCities += cities.length;
  }

  if (selectedUser) {
    // 计算城市数量
    const visitedCities = selectedUser.visitedCities ? selectedUser.visitedCities.length : 0;
    const wishlistCities = selectedUser.wishlistCities ? selectedUser.wishlistCities.length : 0;

    document.getElementById('visitedProvinceCount').textContent = selectedUser.visited.length;
    document.getElementById('visitedCityCount').textContent = visitedCities;
    document.getElementById('wishlistProvinceCount').textContent = selectedUser.wishlist.length;
    document.getElementById('wishlistCityCount').textContent = wishlistCities;

    document.getElementById('visitedProvincePercent').textContent = `(${Math.round(selectedUser.visited.length / totalProvinces * 100)}%)`;
    document.getElementById('visitedCityPercent').textContent = `(${Math.round(visitedCities / totalCities * 100)}%)`;
    document.getElementById('wishlistProvincePercent').textContent = `(${Math.round(selectedUser.wishlist.length / totalProvinces * 100)}%)`;
    document.getElementById('wishlistCityPercent').textContent = `(${Math.round(wishlistCities / totalCities * 100)}%)`;
  } else if (mergeUsers.length === 2) {
    const allV = new Set([...mergeUsers[0].visited, ...mergeUsers[1].visited]);
    const allW = new Set([...mergeUsers[0].wishlist, ...mergeUsers[1].wishlist]);
    const allVCities = new Set([...(mergeUsers[0].visitedCities || []), ...(mergeUsers[1].visitedCities || [])]);
    const allWCities = new Set([...(mergeUsers[0].wishlistCities || []), ...(mergeUsers[1].wishlistCities || [])]);

    document.getElementById('visitedProvinceCount').textContent = allV.size;
    document.getElementById('visitedCityCount').textContent = allVCities.size;
    document.getElementById('wishlistProvinceCount').textContent = allW.size;
    document.getElementById('wishlistCityCount').textContent = allWCities.size;

    document.getElementById('visitedProvincePercent').textContent = `(${Math.round(allV.size / totalProvinces * 100)}%)`;
    document.getElementById('visitedCityPercent').textContent = `(${Math.round(allVCities.size / totalCities * 100)}%)`;
    document.getElementById('wishlistProvincePercent').textContent = `(${Math.round(allW.size / totalProvinces * 100)}%)`;
    document.getElementById('wishlistCityPercent').textContent = `(${Math.round(allWCities.size / totalCities * 100)}%)`;
  } else {
    document.getElementById('visitedProvinceCount').textContent = '0';
    document.getElementById('visitedCityCount').textContent = '0';
    document.getElementById('wishlistProvinceCount').textContent = '0';
    document.getElementById('wishlistCityCount').textContent = '0';
    document.getElementById('visitedProvincePercent').textContent = '(0%)';
    document.getElementById('visitedCityPercent').textContent = '(0%)';
    document.getElementById('wishlistProvincePercent').textContent = '(0%)';
    document.getElementById('wishlistCityPercent').textContent = '(0%)';
  }
}

// 数据管理
function exportData() {
  const data = Storage.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travel-map-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    if (confirm('导入将覆盖当前数据，确定？')) {
      if (Storage.importData(e.target.result)) {
        alert('导入成功');
        loadUserList();
        updateStats();
        const users = Storage.getUsers();
        if (users.length > 0) selectUser(users[0].id);
        else selectedUser = null;
      } else {
        alert('导入失败');
      }
    }
  };
  reader.readAsText(file);
}

function mergeImportData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const result = Storage.mergeImportData(e.target.result);
    if (result.success) {
      let message = '合并导入成功！';
      if (result.added > 0) {
        message += `\n\n新增用户：${result.added} 个`;
      }
      if (result.skipped > 0) {
        message += `\n\n跳过已存在用户：${result.skipped} 个`;
      }
      if (result.added === 0 && result.skipped > 0) {
        message += '\n\n所有用户都已存在，未添加新用户';
      }
      alert(message);
      loadUserList();
      updateStats();
    } else {
      alert('导入失败，请检查文件格式');
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (confirm('确定重置所有数据？')) {
    Storage.clearData();
    selectedUser = null;
    mergeUsers = [];
    selectedProvince = null;
    loadUserList();
    updateStats();
    closeSidebar();
    hideCityMarkers();
    if (provinceLayer) provinceLayer.setStyle(styleFeature);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', initApp);

// 颜色选择器
document.getElementById('colorOptions').addEventListener('click', function(e) {
  if (e.target.classList.contains('color-option')) {
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    e.target.classList.add('selected');
  }
});
