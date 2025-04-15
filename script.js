// 全局数据存储
let restaurantData = null;
let cart = {
    items: [],
    total: 0,
    count: 0
};

// 全局变量，用于防止重复提交
let isSubmitting = false;

// 加载JSON数据
async function loadRestaurantData() {
    try {
        const response = await fetch('data.json');
        restaurantData = await response.json();
        return true;
    } catch (error) {
        console.error('加载数据失败:', error);
        return false;
    }
}

// 初始化页面
async function initializePage() {
    // 加载数据
    const dataLoaded = await loadRestaurantData();
    if (!dataLoaded) {
        showToast('数据加载失败');
        return;
    }

    // 更新餐厅信息
    updateRestaurantInfo();
    
    // 渲染分类
    renderCategories();
    
    // 默认选中第一个分类
    setTimeout(() => {
        const firstCategory = document.querySelector('.category-list li');
        if (firstCategory) {
            firstCategory.click();
        }
    }, 100);
    
    // 初始化规格选择模态框按钮事件
    initializeModalEvents();
    
    // 移动端触摸优化
    addTouchOptimizations();
    
    // 初始化底部结算按钮事件
    initializeCheckoutButton();
}

// 更新餐厅信息
function updateRestaurantInfo() {
    // 更新网页标题
    document.title = restaurantData.restaurant.name;
    
    // 更新餐厅名称
    const restaurantName = document.querySelector('h1.text-2xl.font-bold');
    if (restaurantName) {
        restaurantName.textContent = restaurantData.restaurant.name;
    }

    // 更新通知栏 - 修复小喇叭图标
    const menuTip = document.querySelector('.flex.items-center.text-yellow-800');
    if (menuTip) {
        menuTip.className = 'flex items-center text-yellow-800 text-sm mb-2';
        menuTip.innerHTML = `
            <i class="fas fa-volume-up mr-1"></i>
            <span>${restaurantData.restaurant.notice.text}</span>
        `;
    }

    // 更新餐厅logo
    const logo = document.querySelector('img[alt="餐厅logo"]');
    if (logo) {
        logo.src = restaurantData.restaurant.logo;
    }

    // 添加联系商家点击事件
    const contactButton = document.querySelector('.flex.items-center.text-gray-700');
    if (contactButton) {
        contactButton.style.cursor = 'pointer';
        contactButton.addEventListener('click', function() {
            const phoneNumber = '18777860915';
            const confirmed = window.confirm(`是否拨打电话：${phoneNumber}？`);
            if (confirmed) {
                window.location.href = `tel:${phoneNumber}`;
            }
        });
    }
}

// 渲染分类列表
function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;
    
    categoryList.innerHTML = '';
    
    restaurantData.categories.forEach(category => {
        const li = document.createElement('li');
        li.className = 'py-2 px-3';
        li.textContent = category;
        li.setAttribute('data-category', category);
        
        li.addEventListener('click', function() {
            // 移除其他分类的选中状态
            document.querySelectorAll('.category-list li').forEach(item => {
                item.classList.remove('active');
            });
            
            // 添加当前选中状态
            this.classList.add('active');
            
            // 更新产品列表
            renderProductsByCategory(category);
        });
        
        categoryList.appendChild(li);
    });
}

// 根据分类渲染产品列表
function renderProductsByCategory(category) {
    const productList = document.getElementById('productList');
    if (!productList) return;
    
    productList.style.opacity = '0';
    
    setTimeout(() => {
        productList.innerHTML = '';
        
        const categoryDishes = restaurantData.dishes.filter(dish => dish.category === category);
        
        if (categoryDishes.length === 0) {
            productList.innerHTML = '<div class="text-center text-gray-500 py-4">该分类暂无菜品</div>';
        } else {
            const categoryTitle = document.createElement('h2');
            categoryTitle.className = 'text-lg font-bold mb-2 text-gray-800';
            categoryTitle.textContent = category;
            productList.appendChild(categoryTitle);
            
            categoryDishes.forEach(dish => {
                const dishElement = createDishElement(dish);
                productList.appendChild(dishElement);
            });
        }
        
        productList.style.opacity = '1';
    }, 100);
}

// 创建菜品元素
function createDishElement(dish) {
    const dishDiv = document.createElement('div');
    dishDiv.className = 'flex py-3';
    dishDiv.setAttribute('data-id', dish.id);
    
    // 判断是否为最后一个分类（超级荤菜）
    const isLastCategory = dish.category === restaurantData.categories[restaurantData.categories.length - 1];
    
    // 生成星级HTML
    let starsHtml;
    if (isLastCategory) {
        // 双行五颗星
        const fiveStars = '★'.repeat(5);
        starsHtml = `
            <div class="text-yellow-500 text-sm leading-4">${fiveStars}</div>
            <div class="text-yellow-500 text-sm leading-4">${fiveStars}</div>
        `;
    } else {
        // 普通星级显示
        const stars = '★'.repeat(dish.stars || 3) + '☆'.repeat(5 - (dish.stars || 3));
        starsHtml = `<div class="text-yellow-500 text-sm">${stars}</div>`;
    }
    
    dishDiv.innerHTML = `
        <img src="${dish.image}" alt="${dish.name}" class="w-[70px] h-[70px] object-cover rounded-lg">
        <div class="ml-3 flex-grow">
            <h3 class="text-base font-semibold">${dish.name}</h3>
            <p class="text-gray-600 text-xs">${dish.desc || ''}</p>
            <div class="flex justify-between items-end mt-2">
                <div>
                    <div class="product-price">¥${dish.price}</div>
                    ${starsHtml}
                </div>
                ${dish.needSpecs ? 
                    `<button class="spec-button" data-id="${dish.id}">选规格</button>` :
                    `<button class="add-to-cart-button" data-id="${dish.id}">
                        <i class="fas fa-plus text-white"></i>
                    </button>`
                }
            </div>
        </div>
    `;
    
    // 添加点击事件
    const button = dishDiv.querySelector('button');
    if (button) {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止冒泡
            const dishId = this.getAttribute('data-id');
            if (this.classList.contains('spec-button')) {
                openSpecModal(dishId);
            } else {
                // 直接添加到购物车，默认规格改为"标准"
                const dish = restaurantData.dishes.find(d => d.id == dishId);
                if (dish) {
                    addToCart(dish, '标准');
                }
            }
        });
    }
    
    return dishDiv;
}

// 初始化模态框事件
function initializeModalEvents() {
    // 确认规格按钮
    const confirmBtn = document.getElementById('confirmSpec');
    if (!confirmBtn) return;
    
    confirmBtn.addEventListener('click', function() {
        const modal = document.querySelector('.spec-modal');
        if (!modal) return;
        
        const dishId = modal.getAttribute('data-dish-id');
        const dish = restaurantData.dishes.find(d => d.id == dishId);
        
        if (dish) {
            // 获取选择的规格
            const spiceOption = document.querySelector('.spice-option.active');
            const spice = spiceOption ? spiceOption.getAttribute('data-spice') : '不辣';
            
            // 添加到购物车
            addToCart(dish, spice);
            
            // 关闭模态框
            closeSpecModal();
            
            // 显示提示
            showToast(`已添加"${dish.name}"到购物车`);
        }
    });
    
    // 辣度选项
    const spiceOptions = document.querySelectorAll('.spice-option');
    spiceOptions.forEach(option => {
        option.addEventListener('click', function() {
            spiceOptions.forEach(opt => opt.classList.remove('active', 'bg-red-500', 'text-white'));
            this.classList.add('active', 'bg-red-500', 'text-white');
        });
    });
}

// 打开规格选择模态框
function openSpecModal(dishId) {
    const dish = restaurantData.dishes.find(d => d.id == dishId);
    if (!dish) return;
    
    const modal = document.querySelector('.spec-modal');
    if (!modal) return;
    
    modal.setAttribute('data-dish-id', dishId);
    
    // 更新模态框内容
    document.querySelector('.dish-title').textContent = dish.name;
    document.querySelector('.dish-image').src = dish.image;
    document.querySelector('.dish-image').alt = dish.name;
    document.querySelector('.dish-desc').textContent = dish.desc || '';
    document.querySelector('.dish-price').textContent = `¥${dish.price}`;
    
    // 渲染规格选项
    renderSpecOptions(modal);
    
    // 显示模态框
    modal.classList.add('active');
}

// 渲染规格选项
function renderSpecOptions(modal) {
    // 渲染辣度选项
    const spiceContainer = modal.querySelector('.spice-options');
    if (spiceContainer) {
        spiceContainer.innerHTML = restaurantData.settings.spiceLevels.map(spice => `
            <button class="spice-option ${spice === '不辣' ? 'active bg-red-500 text-white' : ''}" 
                    data-spice="${spice}">
                ${spice}
            </button>
        `).join('');
    }

    // 移除分量选项的渲染
    const portionContainer = modal.querySelector('.portion-options');
    if (portionContainer) {
        portionContainer.style.display = 'none';
    }
}

// 关闭规格选择模态框
function closeSpecModal() {
    const modal = document.querySelector('.spec-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 显示提示信息
function showToast(message) {
    // 创建或获取toast元素
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full opacity-0 transition-opacity duration-300';
        document.body.appendChild(toast);
    }
    
    // 更新消息并显示
    toast.textContent = message;
    toast.style.opacity = '1';
    
    // 3秒后消失
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000); // 缩短移动端提示显示时间
}

// 更新购物车UI
function updateCartUI() {
    // 获取购物车数量显示元素
    const cartCountElem = document.querySelector('.absolute.-top-3.-right-1 span');
    const cartTotalElem = document.getElementById('cartTotal');
    const checkoutButtons = document.querySelectorAll('.checkout-button, .px-6.py-2.bg-red-500.text-white.rounded-full.text-base.font-medium');
    
    console.log('更新购物车UI，当前数量:', cart.count);
    
    if (cartCountElem) {
        cartCountElem.textContent = cart.count;
    }
    
    if (cartTotalElem) {
        cartTotalElem.textContent = `￥${cart.total.toFixed(2)}`;
    }
    
    // 更新所有结算按钮的文本
    checkoutButtons.forEach(button => {
        button.textContent = `去结算${cart.count > 0 ? `(${cart.count}件)` : ''}`;
    });
}

// 切换购物车显示状态
function toggleCart() {
    console.log('切换购物车显示状态');
    
    let cartPanel = document.querySelector('.cart-panel');
    
    // 如果购物车面板不存在，创建它
    if (!cartPanel) {
        cartPanel = document.createElement('div');
        cartPanel.className = 'cart-panel fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg transform translate-y-full transition-transform duration-300 ease-in-out z-50';
        cartPanel.innerHTML = `
            <div class="p-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold">购物车</h3>
                    <button class="close-cart text-gray-500">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="cart-items max-h-[60vh] overflow-y-auto"></div>
                <div class="cart-footer mt-4 border-t pt-4">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-gray-500">合计</span>
                        <span class="cart-total text-xl font-bold text-red-500">￥${cart.total.toFixed(2)}</span>
                    </div>
                    <button class="checkout-button w-full py-3 bg-red-500 text-white rounded-full text-base font-medium">
                        去结算(${cart.count}件)
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(cartPanel);
        
        // 绑定关闭按钮事件
        const closeButton = cartPanel.querySelector('.close-cart');
        if (closeButton) {
            closeButton.addEventListener('click', toggleCart);
        }
        
        // 绑定结算按钮事件
        const checkoutButton = cartPanel.querySelector('.checkout-button');
        if (checkoutButton) {
            checkoutButton.addEventListener('click', handleCheckout);
        }
    }
    
    // 切换显示状态
    if (cartPanel.classList.contains('translate-y-0')) {
        cartPanel.classList.remove('translate-y-0');
        cartPanel.classList.add('translate-y-full');
    } else {
        cartPanel.classList.remove('translate-y-full');
        cartPanel.classList.add('translate-y-0');
        renderCartItems(); // 显示时重新渲染商品列表
    }
}

// 渲染购物车商品列表
function renderCartItems() {
    const cartPanel = document.querySelector('.cart-panel');
    if (!cartPanel) {
        console.error('未找到购物车面板元素');
        return;
    }

    // 获取或创建购物车商品列表容器
    let cartItemsContainer = cartPanel.querySelector('.cart-items');
    if (!cartItemsContainer) {
        cartItemsContainer = document.createElement('div');
        cartItemsContainer.className = 'cart-items p-3 overflow-y-auto';
        cartPanel.insertBefore(cartItemsContainer, cartPanel.querySelector('.cart-footer'));
    }

    // 清空现有内容
    cartItemsContainer.innerHTML = '';

    if (cart.items.length === 0) {
        // 购物车为空时显示提示
        cartItemsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-gray-500">
                <i class="fas fa-shopping-cart text-4xl mb-3"></i>
                <p>购物车是空的</p>
            </div>
        `;
        return;
    }

    // 渲染每个商品
    cart.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'flex items-center justify-between py-3';
        itemElement.innerHTML = `
            <div class="flex items-center flex-1">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
                <div class="ml-3 flex-1">
                    <h4 class="font-medium">${item.name}</h4>
                    <p class="text-sm text-gray-500">${item.spice}</p>
                    <p class="text-red-500 font-medium">￥${item.price}</p>
                </div>
                <div class="flex items-center">
                    <button class="decrease-item w-8 h-8 flex items-center justify-center border rounded-full" data-id="${item.id}">
                        <i class="fas fa-minus text-sm"></i>
                    </button>
                    <span class="mx-3">${item.quantity}</span>
                    <button class="increase-item w-8 h-8 flex items-center justify-center border rounded-full" data-id="${item.id}">
                        <i class="fas fa-plus text-sm"></i>
                    </button>
                </div>
            </div>
        `;

        cartItemsContainer.appendChild(itemElement);
    });

    // 添加事件监听器
    cartItemsContainer.querySelectorAll('.decrease-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = parseInt(e.currentTarget.dataset.id);
            decreaseItemQuantity(itemId);
            renderCartItems(); // 重新渲染购物车
        });
    });

    cartItemsContainer.querySelectorAll('.increase-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = parseInt(e.currentTarget.dataset.id);
            increaseItemQuantity(itemId);
            renderCartItems(); // 重新渲染购物车
        });
    });

    // 更新总价
    updateCartTotal();
}

// 更新购物车总价
function updateCartTotal() {
    const totalElement = document.querySelector('.cart-total');
    if (totalElement) {
        totalElement.textContent = `￥${cart.total.toFixed(2)}`;
    }
}

// 增加商品数量
function increaseItemQuantity(itemId) {
    const item = cart.items.find(item => item.id === itemId);
    if (item) {
        item.quantity += 1;
        cart.total += item.price;
        cart.count += 1;
        updateCartUI();
    }
}

// 减少商品数量
function decreaseItemQuantity(itemId) {
    const itemIndex = cart.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const item = cart.items[itemIndex];
    if (item.quantity > 1) {
        item.quantity -= 1;
        cart.total -= item.price;
        cart.count -= 1;
    } else {
        // 如果数量为1，则移除该商品
        cart.total -= item.price;
        cart.count -= 1;
        cart.items.splice(itemIndex, 1);
    }
    
    updateCartUI();
    renderCartItems(); // 重新渲染购物车列表
}

// 移动端触摸体验优化
function addTouchOptimizations() {
    // 减少点击延迟
    document.addEventListener('touchstart', function() {}, {passive: true});
    
    // 防止过度滚动
    document.querySelectorAll('.overflow-y-auto').forEach(elem => {
        elem.addEventListener('touchmove', function(e) {
            if (this.scrollHeight <= this.clientHeight) {
                e.preventDefault();
            }
        }, {passive: false});
    });
}

// 初始化购物车事件
function initializeCartEvents() {
    console.log('初始化购物车事件');
    
    // 使用更精确的选择器找到购物车图标容器
    const cartContainer = document.querySelector('.cart-icon');
    
    if (cartContainer) {
        cartContainer.addEventListener('click', function(e) {
            console.log('购物车被点击');
            toggleCart();
        });
        cartContainer.style.cursor = 'pointer';
    } else {
        console.error('未找到购物车容器');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成');
    initializePage();
    
    setTimeout(() => {
        initializeCartEvents();
    }, 100);
});

// 添加到购物车成功后的处理
function afterAddToCart() {
    // 显示成功提示
    showToast('成功添加到购物车');
    
    // 关闭规格选择模态框
    closeSpecModal();
    
    // 特别确保更新购物车UI
    updateCartUI();
    
    // 添加购物车图标动画
    const cartIcon = document.querySelector('.w-10.h-10.bg-red-500.rounded-full');
    if (cartIcon) {
        cartIcon.classList.add('animate-bounce');
        setTimeout(() => cartIcon.classList.remove('animate-bounce'), 1000);
    }
}

// 添加到购物车
function addToCart(dish, spice) {
    // 查找购物车中是否已存在相同规格的商品
    const existingItem = cart.items.find(item => 
        item.dishId === dish.id && 
        item.spice === spice
    );
    
    if (existingItem) {
        // 如果存在，增加数量
        existingItem.quantity += 1;
        cart.total += existingItem.price;
        cart.count += 1;
    } else {
        // 创建新的购物车项目，使用传入的规格（标准或其他）
        const cartItem = {
            id: Date.now(),
            dishId: dish.id,
            name: dish.name,
            price: dish.price,
            spice: spice, // 这里会使用传入的规格
            image: dish.image,
            quantity: 1
        };
        
        cart.items.push(cartItem);
        cart.total += cartItem.price;
        cart.count += 1;
    }
    
    // 更新UI
    updateCartUI();
    showToast('已添加到购物车');
}

// 发送邮件函数
async function sendOrderEmail(orderItems) {
    try {
        // 确保emailjs已经加载
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS not loaded');
            return false;
        }

        const response = await emailjs.send(
            "service_kfs4t4o", // Service ID
            "template_keh8qdo", // Template ID
            {
                from_email: '2842094713@qq.com',
                to_email: '2716387257@qq.com',
                message: generateOrderEmailContent(orderItems)
            },
            "T86OzHMDVj-z3sT3i" // 替换为实际的Public Key
        );

        if (response.status === 200) {
            return true;
        }
        throw new Error('邮件发送失败');
    } catch (error) {
        console.error('发送邮件出错:', error);
        return false;
    }
}

// 生成订单邮件内容
function generateOrderEmailContent(orderItems) {
    let content = '您的专属对象在美食铺下单了！\n\n菜品明细：\n';
    
    orderItems.forEach(item => {
        content += `- ${item.name} (${item.spice}) x ${item.quantity}\n`;
    });
    
    content += '\n请您速速接单！';
    
    return content;
}

// 处理结算
async function handleCheckout() {
    if (isSubmitting) {
        showToast('订单正在处理中，请稍候...');
        return;
    }

    if (cart.items.length === 0) {
        showToast('购物车没东西');
        return;
    }

    try {
        isSubmitting = true;
        showToast('正在提交订单...');

        // 发送订单邮件
        const emailSent = await sendOrderEmail(cart.items);
        
        if (!emailSent) {
            throw new Error('邮件发送失败');
        }

        // 清空购物车
        cart.items = [];
        cart.total = 0;
        cart.count = 0;
        updateCartUI();
        
        // 关闭购物车面板
        const cartPanel = document.querySelector('.cart-panel');
        if (cartPanel && cartPanel.classList.contains('translate-y-0')) {
            toggleCart();
        }

        showToast('订单已提交，您的专属厨神会尽快处理');

    } catch (error) {
        console.error('结算出错:', error);
        showToast('订单提交失败，请重试');
    } finally {
        isSubmitting = false;
    }
}

// 更新初始化底部结算按钮
function initializeCheckoutButton() {
    const bottomCheckoutButton = document.querySelector('.px-6.py-2.bg-red-500.text-white.rounded-full.text-base.font-medium');
    if (bottomCheckoutButton) {
        bottomCheckoutButton.addEventListener('click', handleCheckout);
    }
} 