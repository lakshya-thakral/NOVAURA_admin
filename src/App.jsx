import React, { useState, useEffect } from "react";
import { 
  auth, 
  db, 
  googleProvider 
} from "./firebase";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  getDoc
} from "firebase/firestore";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileText, 
  Users, 
  LogOut, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  TrendingUp, 
  DollarSign, 
  ClipboardList, 
  UserCheck, 
  BookOpen, 
  X, 
  ChevronRight, 
  AlertCircle,
  Lock,
  RefreshCw,
  Mail,
  User
} from "lucide-react";

// Admin Emails Whitelist (and anyone with admin in email or toggle is allowed)
const ADMIN_EMAILS = [
  "admin@aura.com",
  "dhairya@aura.com",
  "dhairyagulati@gmail.com"
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Auth Inputs
  const [email, setEmail] = useState("admin@aura.com");
  const [password, setPassword] = useState("admin123");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Global State
  const [products, setProducts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  // Loaders
  const [productsLoading, setProductsLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);

  // Search & Filter
  const [productSearch, setProductSearch] = useState("");
  const [articleSearch, setArticleSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  // Modals / Editing States
  const [productModal, setProductModal] = useState({ isOpen: false, mode: "add", data: null });
  const [articleModal, setArticleModal] = useState({ isOpen: false, mode: "add", data: null });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  // Show Toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if Admin
        const emailLower = currentUser.email?.toLowerCase() || "";
        const isWhitelisted = ADMIN_EMAILS.includes(emailLower);
        const hasAdminKeyword = emailLower.includes("admin");
        
        // Fetch user profile from Firestore to check isAdmin flag
        let isDbAdmin = false;
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists() && userDoc.data().isAdmin) {
            isDbAdmin = true;
          }
        } catch (e) {
          console.warn("Failed to check db admin profile:", e);
        }

        if (isWhitelisted || hasAdminKeyword || isDbAdmin) {
          setIsAdmin(true);
          setAuthError("");
        } else {
          setIsAdmin(false);
          setAuthError("Access Denied: You do not have administrator privileges.");
          // Sign out immediately if not admin
          await signOut(auth);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Listen to Firestore Collections once authenticated as Admin
  useEffect(() => {
    if (!isAdmin || !user) return;

    // 1. Listen to Products
    const qProducts = query(collection(db, "products"));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
      setProductsLoading(false);
    }, (err) => {
      console.error("Products subscription error:", err);
      setProductsLoading(false);
    });

    // 2. Listen to Articles
    const qArticles = query(collection(db, "articles"), orderBy("createdAt", "desc"));
    const unsubArticles = onSnapshot(qArticles, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(list);
      setArticlesLoading(false);
    }, (err) => {
      console.error("Articles subscription error:", err);
      setArticlesLoading(false);
    });

    // 3. Listen to Orders
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(list);
      setOrdersLoading(false);
    }, (err) => {
      console.error("Orders subscription error:", err);
      setOrdersLoading(false);
    });

    // 4. Listen to Users
    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
      setUsersLoading(false);
    }, (err) => {
      console.error("Users subscription error:", err);
      setUsersLoading(false);
    });

    return () => {
      unsubProducts();
      unsubArticles();
      unsubOrders();
      unsubUsers();
    };
  }, [isAdmin, user]);

  // Handle standard login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login error:", err);
      // Fallback: If local default admin is not registered, automatically register them!
      if (
        email.toLowerCase() === "admin@aura.com" &&
        password === "admin123" &&
        (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential")
      ) {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          showToast("Admin account created and logged in!");
          return;
        } catch (createErr) {
          console.error("Auto-create admin account failed:", createErr);
        }
      }
      
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setAuthError("Invalid admin credentials.");
      } else {
        setAuthError(err.message || "An authentication error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setAuthError("");
    setIsSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Login error:", err);
      setAuthError(err.message || "Google Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      showToast("Signed out successfully.");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // --- CRUD Operations ---

  // Save Product (Create or Edit)
  const handleSaveProduct = async (productData) => {
    try {
      const pId = productData.id || "prod_" + Math.random().toString(36).substr(2, 9);
      const docRef = doc(db, "products", pId);
      
      const payload = {
        id: pId,
        title: productData.title,
        description: productData.description,
        price: parseFloat(productData.price) || 0,
        category: productData.category,
        badge: productData.badge || "",
        image: productData.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      showToast(`Product "${payload.title}" saved successfully!`);
      setProductModal({ isOpen: false, mode: "add", data: null });
    } catch (err) {
      console.error("Error saving product:", err);
      showToast("Failed to save product: " + err.message, "error");
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId, title) => {
    if (!window.confirm(`Are you sure you want to delete product "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "products", productId));
      showToast(`Product "${title}" deleted.`);
    } catch (err) {
      console.error("Error deleting product:", err);
      showToast("Failed to delete product.", "error");
    }
  };

  // Save Article (Create or Edit)
  const handleSaveArticle = async (articleData) => {
    try {
      const aId = articleData.id || "art_" + Math.random().toString(36).substr(2, 9);
      const docRef = doc(db, "articles", aId);

      const payload = {
        id: aId,
        title: articleData.title,
        content: articleData.content,
        author: articleData.author || "Admin",
        category: articleData.category || "General",
        image: articleData.image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600",
        createdAt: articleData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      showToast(`Article "${payload.title}" saved successfully!`);
      setArticleModal({ isOpen: false, mode: "add", data: null });
    } catch (err) {
      console.error("Error saving article:", err);
      showToast("Failed to save article: " + err.message, "error");
    }
  };

  // Delete Article
  const handleDeleteArticle = async (articleId, title) => {
    if (!window.confirm(`Are you sure you want to delete article "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "articles", articleId));
      showToast(`Article "${title}" deleted.`);
    } catch (err) {
      console.error("Error deleting article:", err);
      showToast("Failed to delete article.", "error");
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status });
      showToast(`Order status updated to ${status}.`);
      
      // Update local detailed view if open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      showToast("Failed to update order status.", "error");
    }
  };

  // Calculations for Dashboard
  const totalSales = orders
    .filter(o => o.status === "paid" || o.status === "delivered" || o.status === "shipped")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrders = orders.filter(o => o.status === "pending").length;

  // --- Rendering UI States ---

  if (loading) {
    return (
      <div className="loader-container" style={{ minHeight: "100vh" }}>
        <div className="spinner"></div>
        <p>Verifying credentials...</p>
      </div>
    );
  }

  // --- Auth View ---
  if (!user || !isAdmin) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span style={{ fontSize: "1.8rem" }}>⚡</span>
              <span className="brand-text">AURA ADMIN</span>
            </div>
            <h3>Control Center</h3>
            <p>Please log in with an administrator account.</p>
          </div>

          {authError && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin}>
            <div className="form-group">
              <label htmlFor="email">Admin Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@aura.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={isSubmitting}>
              <Lock size={16} />
              <span>{isSubmitting ? "Authenticating..." : "Admin Log In"}</span>
            </button>
          </form>

          <div className="divider">OR</div>

          <button onClick={handleGoogleLogin} className="btn btn-google" disabled={isSubmitting}>
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: "8px" }}>
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.1.14 2.8-.83 1.1-.1.1-2.4 2.8l3.7 2.88c2.2-2.02 3.45-5 3.45-8.53z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.88c-1.03.69-2.35 1.1-4.23 1.1-3.26 0-6.03-2.2-7.02-5.18H1.14v2.98C3.12 21.02 7.23 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M4.98 14.13A7.14 7.14 0 0 1 4.5 12c0-.75.13-1.47.36-2.14V6.88H1.14A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.14 5.37l3.84-3.24z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.23 0 3.12 2.98 1.14 7.02l3.84 3.24c.99-2.98 3.76-5.18 7.02-5.18z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
          
          <div style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
            💡 Hint: Try whitelisted admin emails or any email containing "admin" to log in.
          </div>
        </div>
      </div>
    );
  }

  // --- Main Admin Panel ---
  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand" onClick={() => setActiveTab("dashboard")}>
          <span style={{ fontSize: "1.5rem" }}>⚡</span>
          <span className="brand-text">AURA</span>
          <span className="brand-badge">Hub</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`nav-item ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <ShoppingBag size={18} />
            <span>Products Catalog</span>
          </button>

          <button 
            className={`nav-item ${activeTab === "articles" ? "active" : ""}`}
            onClick={() => setActiveTab("articles")}
          >
            <FileText size={18} />
            <span>Blog Articles</span>
          </button>

          <button 
            className={`nav-item ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <ClipboardList size={18} />
            <span>Order History</span>
            {pendingOrders > 0 && (
              <span className="cart-badge" style={{ position: "static", marginLeft: "auto" }}>
                {pendingOrders}
              </span>
            )}
          </button>

          <button 
            className={`nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={18} />
            <span>User History</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info-bar">
            <div>
              <div className="user-name-small">{user.displayName || user.email.split("@")[0]}</div>
              <div className="user-role-small">Store Manager</div>
            </div>
            <User size={16} color="var(--color-primary)" />
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ color: "#fca5a5" }}>
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-title">
            <h2>
              {activeTab === "dashboard" && "Performance Dashboard"}
              {activeTab === "products" && "Product Catalog Manager"}
              {activeTab === "articles" && "Blog & Articles Manager"}
              {activeTab === "orders" && "Order History & Fulfillment"}
              {activeTab === "users" && "User History & Directory"}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Live connection: <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>Active</span>
            </span>
          </div>
        </header>

        <div className="admin-container">
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-info">
                    <h4>Total Sales (Paid)</h4>
                    <div className="metric-value">${totalSales.toFixed(2)}</div>
                  </div>
                  <div className="metric-icon-wrapper success">
                    <DollarSign size={24} />
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-info">
                    <h4>Total Orders</h4>
                    <div className="metric-value">{orders.length}</div>
                  </div>
                  <div className="metric-icon-wrapper primary">
                    <ClipboardList size={24} />
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-info">
                    <h4>Products Listed</h4>
                    <div className="metric-value">{products.length}</div>
                  </div>
                  <div className="metric-icon-wrapper info">
                    <ShoppingBag size={24} />
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-info">
                    <h4>Registered Users</h4>
                    <div className="metric-value">{users.length}</div>
                  </div>
                  <div className="metric-icon-wrapper warning">
                    <Users size={24} />
                  </div>
                </div>
              </div>

              {/* Dashboard Inner Grid */}
              <div className="dashboard-grid">
                {/* Recent Orders Panel */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3>Recent Transactions</h3>
                    <button className="form-link" onClick={() => setActiveTab("orders")}>View All</button>
                  </div>
                  <div className="table-wrapper">
                    {ordersLoading ? (
                      <div className="loader-container">
                        <div className="spinner" style={{ width: 24, height: 24 }}></div>
                      </div>
                    ) : orders.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", padding: "1rem" }}>No orders placed yet.</p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map(order => (
                            <tr key={order.id}>
                              <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{order.id.slice(0, 8)}...</td>
                              <td>
                                <div style={{ fontWeight: 500 }}>{order.customerDetails?.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.customerDetails?.email}</div>
                              </td>
                              <td style={{ fontSize: "0.8rem" }}>
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ fontWeight: 600 }}>${(order.total || 0).toFixed(2)}</td>
                              <td>
                                <span className={`badge badge-${order.status || "pending"}`}>
                                  {order.status || "pending"}
                                </span>
                              </td>
                              <td>
                                <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setSelectedOrder(order)}>
                                  <Eye size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right panel: Recent Articles */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3>Recent Articles</h3>
                    <button className="form-link" onClick={() => setActiveTab("articles")}>Manage</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {articlesLoading ? (
                      <div className="loader-container">
                        <div className="spinner" style={{ width: 24, height: 24 }}></div>
                      </div>
                    ) : articles.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", padding: "1rem", textAlign: "center" }}>No articles written.</p>
                    ) : (
                      articles.slice(0, 4).map(art => (
                        <div key={art.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-glow)" }}>
                          <img src={art.image} alt={art.title} style={{ width: "40px", height: "40px", borderRadius: "4px", objectFit: "cover" }} />
                          <div style={{ flexGrow: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{art.title}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>By {art.author} in {art.category}</div>
                          </div>
                          <ChevronRight size={14} color="var(--text-muted)" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS CATALOG TAB */}
          {activeTab === "products" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="actions-bar">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon-inside" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search products by title or category..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-accent" onClick={() => setProductModal({ isOpen: true, mode: "add", data: null })}>
                  <Plus size={18} />
                  <span>Add New Product</span>
                </button>
              </div>

              <div className="panel-card">
                <div className="table-wrapper">
                  {productsLoading ? (
                    <div className="loader-container">
                      <div className="spinner"></div>
                      <p>Loading products from database...</p>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="empty-state">
                      <ShoppingBag size={48} />
                      <h4>No Products Found</h4>
                      <p>Your product catalog is empty. Create your first product to display it in the store.</p>
                      <button className="btn btn-primary" onClick={() => setProductModal({ isOpen: true, mode: "add", data: null })}>
                        Create Product
                      </button>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product info</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Badge</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products
                          .filter(p => 
                            p.title?.toLowerCase().includes(productSearch.toLowerCase()) || 
                            p.category?.toLowerCase().includes(productSearch.toLowerCase())
                          )
                          .map(prod => (
                            <tr key={prod.id}>
                              <td>
                                <div className="product-row-info">
                                  <img src={prod.image} alt={prod.title} className="product-row-img" />
                                  <div className="product-row-details">
                                    <span className="product-row-title">{prod.title}</span>
                                    <span className="product-row-id">ID: {prod.id}</span>
                                  </div>
                                </div>
                              </td>
                              <td>{prod.category}</td>
                              <td style={{ fontWeight: 600, color: "#fff" }}>${(prod.price || 0).toFixed(2)}</td>
                              <td>
                                {prod.badge ? (
                                  <span className="product-badge" style={{ position: "static", display: "inline-block", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", color: "#818cf8" }}>
                                    {prod.badge}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>None</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => setProductModal({ isOpen: true, mode: "edit", data: prod })} title="Edit Product">
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDeleteProduct(prod.id, prod.title)} title="Delete Product">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BLOG ARTICLES TAB */}
          {activeTab === "articles" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="actions-bar">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon-inside" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search articles by title, author, or category..."
                    value={articleSearch}
                    onChange={(e) => setArticleSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-accent" onClick={() => setArticleModal({ isOpen: true, mode: "add", data: null })}>
                  <Plus size={18} />
                  <span>Write Article</span>
                </button>
              </div>

              <div className="panel-card">
                <div className="table-wrapper">
                  {articlesLoading ? (
                    <div className="loader-container">
                      <div className="spinner"></div>
                      <p>Loading blog articles from database...</p>
                    </div>
                  ) : articles.length === 0 ? (
                    <div className="empty-state">
                      <BookOpen size={48} />
                      <h4>No Articles Written</h4>
                      <p>Share news, release updates, or design processes on your store blog.</p>
                      <button className="btn btn-primary" onClick={() => setArticleModal({ isOpen: true, mode: "add", data: null })}>
                        Write First Article
                      </button>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Article info</th>
                          <th>Author</th>
                          <th>Category</th>
                          <th>Published Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {articles
                          .filter(a => 
                            a.title?.toLowerCase().includes(articleSearch.toLowerCase()) || 
                            a.author?.toLowerCase().includes(articleSearch.toLowerCase()) ||
                            a.category?.toLowerCase().includes(articleSearch.toLowerCase())
                          )
                          .map(art => (
                            <tr key={art.id}>
                              <td>
                                <div className="product-row-info">
                                  <img src={art.image} alt={art.title} className="product-row-img" />
                                  <div className="product-row-details">
                                    <span className="product-row-title">{art.title}</span>
                                    <span className="product-row-id">ID: {art.id}</span>
                                  </div>
                                </div>
                              </td>
                              <td>{art.author}</td>
                              <td>{art.category}</td>
                              <td style={{ fontSize: "0.85rem" }}>
                                {new Date(art.createdAt || art.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => setArticleModal({ isOpen: true, mode: "edit", data: art })} title="Edit Article">
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDeleteArticle(art.id, art.title)} title="Delete Article">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS HISTORY TAB */}
          {activeTab === "orders" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="actions-bar">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon-inside" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by customer name, email, or order ID..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Status:</span>
                  <select 
                    className="filter-select"
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="panel-card">
                <div className="table-wrapper">
                  {ordersLoading ? (
                    <div className="loader-container">
                      <div className="spinner"></div>
                      <p>Loading order data...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="empty-state">
                      <ClipboardList size={48} />
                      <h4>No Orders Found</h4>
                      <p>No transactions have occurred on your client store front yet.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer Details</th>
                          <th>Date</th>
                          <th>Total Amount</th>
                          <th>Items Count</th>
                          <th>Status</th>
                          <th>Fulfillment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders
                          .filter(o => {
                            const matchSearch = 
                              o.id?.toLowerCase().includes(orderSearch.toLowerCase()) || 
                              o.customerDetails?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                              o.customerDetails?.email?.toLowerCase().includes(orderSearch.toLowerCase());
                            const matchStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
                            return matchSearch && matchStatus;
                          })
                          .map(order => (
                            <tr key={order.id}>
                              <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                                {order.id}
                              </td>
                              <td>
                                <div style={{ fontWeight: 500, color: "#fff" }}>{order.customerDetails?.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.customerDetails?.email}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.customerDetails?.phone}</div>
                              </td>
                              <td style={{ fontSize: "0.85rem" }}>
                                {new Date(order.createdAt).toLocaleString()}
                              </td>
                              <td style={{ fontWeight: 700, color: "#fff" }}>${(order.total || 0).toFixed(2)}</td>
                              <td>
                                {order.items?.reduce((c, i) => c + i.quantity, 0) || 0} items
                              </td>
                              <td>
                                <span className={`badge badge-${order.status || "pending"}`}>
                                  {order.status || "pending"}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => setSelectedOrder(order)}>
                                    <Eye size={14} style={{ marginRight: "4px" }} />
                                    <span>Manage</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* USER HISTORY TAB */}
          {activeTab === "users" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="actions-bar">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon-inside" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="table-wrapper">
                  {usersLoading ? (
                    <div className="loader-container">
                      <div className="spinner"></div>
                      <p>Loading user directory...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="empty-state">
                      <Users size={48} />
                      <h4>No Registered Users</h4>
                      <p>No customer profiles are created in Firestore yet.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>User Profile</th>
                          <th>User ID</th>
                          <th>Registered Date</th>
                          <th>Contact Details</th>
                          <th>Default Shipping Address</th>
                          <th>Orders Placed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users
                          .filter(u => 
                            u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                            u.email?.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map(usr => {
                            // Calculate orders placed by this user
                            const orderCount = orders.filter(o => o.userId === usr.uid).length;
                            return (
                              <tr key={usr.uid}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-primary-glow)", border: "1px solid var(--color-primary)", display: "flex", alignItems: "center", justifyMutally: "center", justifyContent: "center" }}>
                                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#818cf8" }}>
                                        {(usr.name || usr.email || "U").charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, color: "#fff" }}>{usr.name || "N/A"}</div>
                                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{usr.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {usr.uid}
                                </td>
                                <td style={{ fontSize: "0.85rem" }}>
                                  {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : "N/A"}
                                </td>
                                <td style={{ fontSize: "0.85rem" }}>
                                  <div>Phone: {usr.phone || "N/A"}</div>
                                </td>
                                <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {usr.address?.street ? (
                                    `${usr.address.street}, ${usr.address.city}, ${usr.address.country}`
                                  ) : (
                                    "No address saved"
                                  )}
                                </td>
                                <td>
                                  <span className="badge" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glow)", color: "#fff" }}>
                                    {orderCount} order(s)
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL DIALOGS --- */}

      {/* Product Edit / Add Modal */}
      {productModal.isOpen && (
        <ProductFormModal 
          mode={productModal.mode} 
          data={productModal.data}
          onClose={() => setProductModal({ isOpen: false, mode: "add", data: null })}
          onSave={handleSaveProduct}
        />
      )}

      {/* Article Edit / Add Modal */}
      {articleModal.isOpen && (
        <ArticleFormModal 
          mode={articleModal.mode} 
          data={articleModal.data}
          onClose={() => setArticleModal({ isOpen: false, mode: "add", data: null })}
          onSave={handleSaveArticle}
        />
      )}

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: "650px" }}>
            <div className="modal-header">
              <h3>Order Details</h3>
              <button className="modal-close-btn" onClick={() => setSelectedOrder(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="order-detail-grid">
                <div className="order-detail-section">
                  <h4>Order Summary</h4>
                  <p><strong>Order ID:</strong> <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{selectedOrder.id}</span></p>
                  <p><strong>Placed On:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={`badge badge-${selectedOrder.status || "pending"}`} style={{ marginLeft: "4px" }}>
                      {selectedOrder.status || "pending"}
                    </span>
                  </p>
                  <p><strong>Payment Method:</strong> Razorpay Gateway</p>
                  {selectedOrder.paymentDetails?.razorpayPaymentId && (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      <strong>Payment ID:</strong> {selectedOrder.paymentDetails.razorpayPaymentId}
                    </p>
                  )}
                </div>

                <div className="order-detail-section">
                  <h4>Shipping Address</h4>
                  <p><strong>Customer:</strong> {selectedOrder.customerDetails?.name}</p>
                  <p><strong>Email:</strong> {selectedOrder.customerDetails?.email}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customerDetails?.phone}</p>
                  <p>
                    <strong>Address:</strong><br />
                    {selectedOrder.customerDetails?.address?.street}<br />
                    {selectedOrder.customerDetails?.address?.city}, {selectedOrder.customerDetails?.address?.postalCode}<br />
                    {selectedOrder.customerDetails?.address?.country}
                  </p>
                </div>
              </div>

              <div className="order-detail-section">
                <h4>Items Ordered</h4>
                <div className="order-items-list">
                  {selectedOrder.items?.map((item) => (
                    <div className="order-item-row" key={item.id}>
                      <img src={item.image} alt={item.title} className="order-item-img" />
                      <div className="order-item-details">
                        <div className="order-item-title">{item.title}</div>
                        <div className="order-item-price-qty">${item.price} x {item.quantity}</div>
                      </div>
                      <div className="order-item-total">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="order-totals-summary">
                  <div className="order-total-row">
                    <span>Subtotal:</span>
                    <span>${(selectedOrder.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="order-total-row">
                    <span>Estimated Tax (8%):</span>
                    <span>${(selectedOrder.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="order-total-row grand">
                    <span>Total Amount:</span>
                    <span>${(selectedOrder.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="order-detail-section" style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--border-glow)" }}>
                <h4 style={{ border: "none", padding: "0", marginBottom: "0.5rem" }}>Fulfillment Actions</h4>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Update Status:</span>
                  <select
                    className="filter-select"
                    style={{ background: "#1e293b", width: "160px" }}
                    value={selectedOrder.status || "pending"}
                    onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>
          <AlertCircle size={18} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// --- Product Form Modal Sub-component ---
function ProductFormModal({ mode, data, onClose, onSave }) {
  const [title, setTitle] = useState(data?.title || "");
  const [description, setDescription] = useState(data?.description || "");
  const [price, setPrice] = useState(data?.price || "");
  const [category, setCategory] = useState(data?.category || "Audio");
  const [badge, setBadge] = useState(data?.badge || "");
  const [image, setImage] = useState(data?.image || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !price || !category || !image) {
      alert("Please fill out all required fields.");
      return;
    }
    onSave({
      id: data?.id, // undefined for "add" mode
      title,
      description,
      price,
      category,
      badge,
      image
    });
  };

  const categories = ["Audio", "Smart Home", "Wearables", "Desk Setup"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === "add" ? "Add New Shop Product" : "Edit Product Details"}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Product Title *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Aura SoundLink Max"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                className="form-input form-textarea" 
                placeholder="Write a brief overview of product benefits, key specs..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price (USD) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input" 
                  placeholder="149.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select 
                  className="form-input"
                  style={{ background: "rgba(255,255,255,0.03)", color: "#fff", appearance: "none" }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map(c => <option key={c} value={c} style={{ background: "#0d121f" }}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Badge (e.g. "New", "Best Seller", "Limited Edition")</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="New Arrival"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Image URL *</label>
              <input 
                type="url" 
                className="form-input" 
                placeholder="https://images.unsplash.com/photo-..."
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
              {image && (
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>Preview:</span>
                  <img src={image} alt="Preview" style={{ maxWidth: "120px", maxHeight: "120px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--border-glow)" }} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"; }} />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Article Form Modal Sub-component ---
function ArticleFormModal({ mode, data, onClose, onSave }) {
  const [title, setTitle] = useState(data?.title || "");
  const [content, setContent] = useState(data?.content || "");
  const [author, setAuthor] = useState(data?.author || "");
  const [category, setCategory] = useState(data?.category || "Tech");
  const [image, setImage] = useState(data?.image || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content || !image) {
      alert("Please fill out all required fields.");
      return;
    }
    onSave({
      id: data?.id,
      title,
      content,
      author: author || "AURA Editor",
      category,
      image,
      createdAt: data?.createdAt // keep original date if editing
    });
  };

  const categories = ["Tech", "Smart Living", "Design", "Updates", "General"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: "650px" }}>
        <div className="modal-header">
          <h3>{mode === "add" ? "Write New Article" : "Edit Article Content"}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Article Title *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="The Future of Circadian Lighting"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Author</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Dhairya Gulati"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select 
                  className="form-input"
                  style={{ background: "rgba(255,255,255,0.03)", color: "#fff", appearance: "none" }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map(c => <option key={c} value={c} style={{ background: "#0d121f" }}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Article Body Content *</label>
              <textarea 
                className="form-input form-textarea" 
                style={{ minHeight: "220px" }}
                placeholder="Write your article copy here. Feel free to use multiple paragraphs..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Header Image URL *</label>
              <input 
                type="url" 
                className="form-input" 
                placeholder="https://images.unsplash.com/photo-..."
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
              {image && (
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>Preview:</span>
                  <img src={image} alt="Preview" style={{ maxWidth: "200px", maxHeight: "120px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--border-glow)" }} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600"; }} />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Publish Article</button>
          </div>
        </form>
      </div>
    </div>
  );
}
