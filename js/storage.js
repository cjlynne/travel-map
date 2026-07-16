/**
 * 存储管理模块
 * 负责数据的持久化存储和读取
 */
const Storage = {
  // 存储键名
  STORAGE_KEY: 'travelMapData',

  /**
   * 获取所有数据
   * @returns {Object} 包含用户数据的对象
   */
  getData() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : { users: [] };
    } catch (error) {
      console.error('读取数据失败:', error);
      return { users: [] };
    }
  },

  /**
   * 保存所有数据
   * @param {Object} data - 要保存的数据对象
   */
  saveData(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  },

  /**
   * 获取所有用户
   * @returns {Array} 用户数组
   */
  getUsers() {
    return this.getData().users;
  },

  /**
   * 添加新用户
   * @param {Object} user - 用户对象 { id, name, color, visited, wishlist }
   * @returns {boolean} 是否添加成功
   */
  addUser(user) {
    const data = this.getData();
    // 检查用户名是否已存在
    if (data.users.some(u => u.name === user.name)) {
      return false;
    }
    data.users.push(user);
    return this.saveData(data);
  },

  /**
   * 删除用户
   * @param {number} userId - 用户ID
   * @returns {boolean} 是否删除成功
   */
  deleteUser(userId) {
    const data = this.getData();
    data.users = data.users.filter(u => u.id !== userId);
    return this.saveData(data);
  },

  /**
   * 更新用户信息
   * @param {number} userId - 用户ID
   * @param {Object} updates - 要更新的字段
   * @returns {boolean} 是否更新成功
   */
  updateUser(userId, updates) {
    const data = this.getData();
    const userIndex = data.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return false;
    }
    data.users[userIndex] = { ...data.users[userIndex], ...updates };
    return this.saveData(data);
  },

  /**
   * 获取单个用户
   * @param {number} userId - 用户ID
   * @returns {Object|null} 用户对象或null
   */
  getUser(userId) {
    const users = this.getUsers();
    return users.find(u => u.id === userId) || null;
  },

  /**
   * 切换省份的访问状态
   * @param {number} userId - 用户ID
   * @param {string} province - 省份名称
   * @param {string} type - 'visited' 或 'wishlist'
   */
  toggleProvince(userId, province, type) {
    const user = this.getUser(userId);
    if (!user) return false;

    const list = type === 'visited' ? user.visited : user.wishlist;
    const index = list.indexOf(province);

    if (index > -1) {
      // 已存在，移除
      list.splice(index, 1);
    } else {
      // 不存在，添加
      list.push(province);
      // 如果添加到visited，从wishlist中移除
      if (type === 'visited') {
        const wishlistIndex = user.wishlist.indexOf(province);
        if (wishlistIndex > -1) {
          user.wishlist.splice(wishlistIndex, 1);
        }
      }
      // 如果添加到wishlist，从visited中移除
      if (type === 'wishlist') {
        const visitedIndex = user.visited.indexOf(province);
        if (visitedIndex > -1) {
          user.visited.splice(visitedIndex, 1);
        }
      }
    }

    return this.updateUser(userId, {
      visited: user.visited,
      wishlist: user.wishlist
    });
  },

  /**
   * 导出数据为JSON字符串
   * @returns {string} JSON字符串
   */
  exportData() {
    const data = this.getData();
    return JSON.stringify(data, null, 2);
  },

  /**
   * 从JSON字符串导入数据（覆盖模式）
   * @param {string} jsonString - JSON字符串
   * @returns {boolean} 是否导入成功
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      // 验证数据结构
      if (!data.users || !Array.isArray(data.users)) {
        return false;
      }
      // 验证每个用户的数据结构
      for (const user of data.users) {
        if (!user.id || !user.name || !user.color || !Array.isArray(user.visited) || !Array.isArray(user.wishlist)) {
          return false;
        }
      }
      return this.saveData(data);
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  },

  /**
   * 从JSON字符串合并导入数据（保留现有用户，添加新用户）
   * @param {string} jsonString - JSON字符串
   * @returns {Object} { success: boolean, added: number, skipped: number }
   */
  mergeImportData(jsonString) {
    try {
      const importData = JSON.parse(jsonString);
      // 验证数据结构
      if (!importData.users || !Array.isArray(importData.users)) {
        return { success: false, added: 0, skipped: 0 };
      }
      // 验证每个用户的数据结构
      for (const user of importData.users) {
        if (!user.id || !user.name || !user.color || !Array.isArray(user.visited) || !Array.isArray(user.wishlist)) {
          return { success: false, added: 0, skipped: 0 };
        }
      }

      const currentData = this.getData();
      let added = 0;
      let skipped = 0;

      // 计算当前最大ID
      let maxId = currentData.users.length > 0
        ? Math.max(...currentData.users.map(u => u.id))
        : 0;

      for (const importUser of importData.users) {
        // 检查用户名是否已存在
        const existingUser = currentData.users.find(u => u.name === importUser.name);

        if (existingUser) {
          // 用户已存在，跳过
          skipped++;
        } else {
          // 用户不存在，添加（生成新的唯一ID）
          maxId++;
          const newUser = {
            ...importUser,
            id: maxId,
            // 确保有visitedCities和wishlistCities字段
            visitedCities: importUser.visitedCities || [],
            wishlistCities: importUser.wishlistCities || []
          };
          currentData.users.push(newUser);
          added++;
        }
      }

      if (added > 0) {
        this.saveData(currentData);
      }

      return { success: true, added, skipped };
    } catch (error) {
      console.error('合并导入数据失败:', error);
      return { success: false, added: 0, skipped: 0 };
    }
  },

  /**
   * 清空所有数据
   * @returns {boolean} 是否清空成功
   */
  clearData() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  },

  /**
   * 生成唯一ID
   * @returns {number} 唯一ID
   */
  generateId() {
    const users = this.getUsers();
    if (users.length === 0) {
      return 1;
    }
    return Math.max(...users.map(u => u.id)) + 1;
  }
};
