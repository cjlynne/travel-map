/**
 * 地图交互模块
 * 负责地图的显示和交互逻辑
 */
const Map = {
  // 当前选中的用户
  currentUser: null,

  // 当前操作模式
  currentMode: 'visited',

  // 合并模式状态
  mergeMode: false,

  // 合并的两个用户
  mergeUsers: [],

  // 所有省份元素
  provinces: [],

  // 省份列表
  provinceList: [
    '北京', '天津', '河北', '山西', '内蒙古',
    '辽宁', '吉林', '黑龙江', '上海', '江苏',
    '浙江', '安徽', '福建', '江西', '山东',
    '河南', '湖北', '湖南', '广东', '广西',
    '海南', '重庆', '四川', '贵州', '云南',
    '西藏', '陕西', '甘肃', '青海', '宁夏',
    '新疆', '台湾', '香港', '澳门'
  ],

  /**
   * 初始化地图
   */
  init() {
    this.loadMap();
    this.bindEvents();
  },

  /**
   * 加载SVG地图
   */
  loadMap() {
    const mapContainer = document.getElementById('mapContainer');

    // 直接使用内联SVG
    fetch('data/china-map.svg')
      .then(response => response.text())
      .then(svgContent => {
        mapContainer.innerHTML = svgContent;
        this.provinces = document.querySelectorAll('.province');
        this.updateMapDisplay();
      })
      .catch(error => {
        console.error('加载地图失败:', error);
        // 如果加载失败，显示错误信息
        mapContainer.innerHTML = '<p style="text-align: center; color: #666;">地图加载失败，请刷新页面重试</p>';
      });
  },

  /**
   * 绑定事件
   */
  bindEvents() {
    // 使用事件委托处理省份点击
    document.getElementById('mapContainer').addEventListener('click', (e) => {
      const province = e.target.closest('.province');
      if (province) {
        this.handleProvinceClick(province);
      }
    });

    // 鼠标悬停事件
    document.getElementById('mapContainer').addEventListener('mouseover', (e) => {
      const province = e.target.closest('.province');
      if (province) {
        this.handleProvinceHover(province, e);
      }
    });

    // 鼠标离开事件
    document.getElementById('mapContainer').addEventListener('mouseout', (e) => {
      const province = e.target.closest('.province');
      if (province) {
        this.handleProvinceLeave(province);
      }
    });

    // 鼠标移动事件（用于提示框跟随）
    document.getElementById('mapContainer').addEventListener('mousemove', (e) => {
      const tooltip = document.getElementById('tooltip');
      if (tooltip.classList.contains('show')) {
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
      }
    });
  },

  /**
   * 处理省份点击
   * @param {Element} provinceElement - 省份SVG元素
   */
  handleProvinceClick(provinceElement) {
    const provinceName = provinceElement.getAttribute('data-name');

    // 如果是合并模式，不处理点击
    if (this.mergeMode) {
      return;
    }

    // 如果没有选中用户，提示用户
    if (!this.currentUser) {
      this.showToast('请先选择或添加一个用户');
      return;
    }

    // 切换省份状态
    Storage.toggleProvince(this.currentUser.id, provinceName, this.currentMode);

    // 添加动画效果
    provinceElement.classList.add('pulse');
    setTimeout(() => {
      provinceElement.classList.remove('pulse');
    }, 300);

    // 更新地图显示
    this.updateMapDisplay();

    // 触发自定义事件，通知App更新统计
    document.dispatchEvent(new CustomEvent('provinceChanged'));
  },

  /**
   * 处理省份悬停
   * @param {Element} provinceElement - 省份SVG元素
   * @param {Event} event - 鼠标事件
   */
  handleProvinceHover(provinceElement, event) {
    const provinceName = provinceElement.getAttribute('data-name');
    const tooltip = document.getElementById('tooltip');

    // 构建提示内容
    let tooltipContent = `<strong>${provinceName}</strong>`;

    if (this.mergeMode && this.mergeUsers.length === 2) {
      // 合并模式
      const user1 = this.mergeUsers[0];
      const user2 = this.mergeUsers[1];
      const user1Visited = user1.visited.includes(provinceName);
      const user2Visited = user2.visited.includes(provinceName);
      const user1Wishlist = user1.wishlist.includes(provinceName);
      const user2Wishlist = user2.wishlist.includes(provinceName);

      tooltipContent += '<br>';
      if (user1Visited) {
        tooltipContent += `<span style="color: ${user1.color}">● ${user1.name}去过</span><br>`;
      } else if (user1Wishlist) {
        tooltipContent += `<span style="color: ${user1.color}">● ${user1.name}想去</span><br>`;
      }

      if (user2Visited) {
        tooltipContent += `<span style="color: ${user2.color}">● ${user2.name}去过</span><br>`;
      } else if (user2Wishlist) {
        tooltipContent += `<span style="color: ${user2.color}">● ${user2.name}想去</span><br>`;
      }
    } else if (this.currentUser) {
      // 单用户模式
      const user = this.currentUser;
      const isVisited = user.visited.includes(provinceName);
      const isWishlist = user.wishlist.includes(provinceName);

      tooltipContent += '<br>';
      if (isVisited) {
        tooltipContent += '<span style="color: #FF6B6B">✓ 已去过</span>';
      } else if (isWishlist) {
        tooltipContent += '<span style="color: #F39C12">★ 想去</span>';
      } else {
        tooltipContent += '<span style="color: #999">○ 未标记</span>';
      }
    }

    tooltip.innerHTML = tooltipContent;
    tooltip.classList.add('show');
    tooltip.style.left = (event.pageX + 15) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
  },

  /**
   * 处理省份鼠标离开
   * @param {Element} provinceElement - 省份SVG元素
   */
  handleProvinceLeave(provinceElement) {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('show');
  },

  /**
   * 更新地图显示
   */
  updateMapDisplay() {
    if (this.mergeMode && this.mergeUsers.length === 2) {
      this.updateMergeModeDisplay();
    } else if (this.currentUser) {
      this.updateSingleUserDisplay();
    } else {
      // 没有选中用户，显示默认灰色
      this.provinces.forEach(province => {
        province.classList.remove('visited', 'wishlist', 'visited-by-other', 'both-visited');
        province.style.fill = '';
      });
    }
  },

  /**
   * 更新单用户模式显示
   */
  updateSingleUserDisplay() {
    const user = this.currentUser;

    this.provinces.forEach(province => {
      const provinceName = province.getAttribute('data-name');
      const isVisited = user.visited.includes(provinceName);
      const isWishlist = user.wishlist.includes(provinceName);

      // 清除所有状态类
      province.classList.remove('visited', 'wishlist', 'visited-by-other', 'both-visited');

      if (isVisited) {
        province.classList.add('visited');
        province.style.fill = user.color;
      } else if (isWishlist) {
        province.classList.add('wishlist');
        province.style.fill = '#F39C12';
      } else {
        province.style.fill = '';
      }
    });
  },

  /**
   * 更新合并模式显示
   */
  updateMergeModeDisplay() {
    const user1 = this.mergeUsers[0];
    const user2 = this.mergeUsers[1];

    this.provinces.forEach(province => {
      const provinceName = province.getAttribute('data-name');
      const user1Visited = user1.visited.includes(provinceName);
      const user2Visited = user2.visited.includes(provinceName);
      const user1Wishlist = user1.wishlist.includes(provinceName);
      const user2Wishlist = user2.wishlist.includes(provinceName);

      // 清除所有状态类
      province.classList.remove('visited', 'wishlist', 'visited-by-other', 'both-visited');

      if (user1Visited && user2Visited) {
        // 两人都去过
        province.classList.add('both-visited');
        province.style.fill = '#9B59B6';
      } else if (user1Visited) {
        // 只有user1去过
        province.classList.add('visited');
        province.style.fill = user1.color;
      } else if (user2Visited) {
        // 只有user2去过
        province.classList.add('visited-by-other');
        province.style.fill = user2.color;
      } else if (user1Wishlist || user2Wishlist) {
        // 有人想去
        province.classList.add('wishlist');
        province.style.fill = '#F39C12';
      } else {
        province.style.fill = '';
      }
    });
  },

  /**
   * 设置当前用户
   * @param {Object} user - 用户对象
   */
  setCurrentUser(user) {
    this.currentUser = user;
    this.mergeMode = false;
    this.mergeUsers = [];
    this.updateMapDisplay();
  },

  /**
   * 设置操作模式
   * @param {string} mode - 'visited' 或 'wishlist'
   */
  setMode(mode) {
    this.currentMode = mode;
  },

  /**
   * 进入合并模式
   * @param {Array} users - 要合并的两个用户
   */
  enterMergeMode(users) {
    this.mergeMode = true;
    this.mergeUsers = users;
    this.currentUser = null;
    this.updateMapDisplay();
  },

  /**
   * 退出合并模式
   */
  exitMergeMode() {
    this.mergeMode = false;
    this.mergeUsers = [];
    this.updateMapDisplay();
  },

  /**
   * 显示提示信息
   * @param {string} message - 提示信息
   */
  showToast(message) {
    // 创建一个简单的提示
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 30px;
      border-radius: 25px;
      z-index: 3000;
      animation: fadeInOut 3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};
