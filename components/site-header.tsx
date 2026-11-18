"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiArrowRight, FiMinus, FiPlus, FiShoppingBag, FiTrash2, FiUser, FiX } from "react-icons/fi";
import { getStoreStatus } from "../lib/store-status";
import { formatMoney } from "../api/lib/money";

type CartItem = { id: string; slug?: string; name: string; images?: string[]; price: number; qty: number; variationId?: string };
const CART_CHANGE = "epic-cart-updated";
const CART_OPEN = "epic-cart-open";
const cartKey = (item: CartItem) => item.variationId && !item.id.includes("__") ? `${item.id}__${item.variationId}` : item.id;

export function SiteHeader() {
  const pathname = usePathname();
  const [storeName, setStoreName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"popup" | "side">("popup");

  useEffect(() => {
    getStoreStatus().then((data) => {
      setStoreName(data.config?.storeName ?? "");
      setLogoUrl(data.config?.logoUrl ?? "");
      setMode(data.config?.featureFlags?.cartDisplayMode === "side" ? "side" : "popup");
    }).catch(() => setStoreName(""));
    const syncCart = () => {
      try { setCart(JSON.parse(localStorage.getItem("epic-cart") ?? "[]") as CartItem[]); }
      catch { setCart([]); }
    };
    const showCart = () => { syncCart(); setOpen(true); };
    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener(CART_CHANGE, syncCart);
    window.addEventListener(CART_OPEN, showCart);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener(CART_CHANGE, syncCart);
      window.removeEventListener(CART_OPEN, showCart);
    };
  }, []);

  if (pathname === "/" || pathname === "/order-success" || pathname?.startsWith("/admin") || pathname?.startsWith("/onboarding")) return null;

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  function save(next: CartItem[]) {
    setCart(next);
    localStorage.setItem("epic-cart", JSON.stringify(next));
    window.dispatchEvent(new Event(CART_CHANGE));
  }
  function quantity(item: CartItem, delta: number) {
    const nextQty = item.qty + delta;
    save(nextQty > 0 ? cart.map((row) => cartKey(row) === cartKey(item) ? { ...row, qty: nextQty } : row) : cart.filter((row) => cartKey(row) !== cartKey(item)));
  }

  return (
    <>
      <nav className="site-nav">
        <Link href="/" className="brand">
          {logoUrl ? <img src={logoUrl} alt={storeName} className="mr-2 inline-block h-9 w-9 rounded-xl object-contain" /> : <span className="mr-2 inline-block h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-cyan text-center font-display text-lg font-black leading-9 text-white shadow-md shadow-indigo-500/30">{(storeName || "E").charAt(0).toUpperCase()}</span>}
          {storeName}
        </Link>
        <div className="nav-links"><Link href="/" prefetch>Home</Link><Link href="/shop" prefetch>Shop</Link><Link href="/account" prefetch>Account</Link></div>
        <div className="nav-actions">
          <Link href="/account" className="icon-btn" aria-label="Account" prefetch><FiUser /></Link>
          <button type="button" className="bag-button" aria-label={`Open cart, ${count} items`} onClick={() => setOpen(true)}><FiShoppingBag /><span>{count}</span></button>
        </div>
      </nav>
      {open && <div className={`cart-overlay ${mode === "side" ? "cart-overlay-side" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className={`cart-dialog ${mode === "side" ? "cart-dialog-side" : ""}`} role="dialog" aria-modal="true" aria-label="Your cart">
          <header className="cart-header"><h2><FiShoppingBag /> Your Cart ({count})</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close cart"><FiX /></button></header>
          {cart.length === 0 ? <div className="cart-empty"><FiShoppingBag /><h3>Your cart is empty</h3><p>Explore the shop and add your favorite items.</p><Link href="/shop" onClick={() => setOpen(false)}>Continue shopping</Link></div> : <>
            <div className="cart-items">{cart.map((item) => <article className="cart-item" key={cartKey(item)}>
              <img src={item.images?.[0] || "/product-placeholder.svg"} alt={item.name} />
              <div className="cart-item-details"><strong>{item.name}</strong><div className="price">{formatMoney(item.price)}</div><div className="qty-control"><button type="button" aria-label={`Decrease ${item.name}`} onClick={() => quantity(item, -1)}><FiMinus /></button><span>{item.qty}</span><button type="button" aria-label={`Increase ${item.name}`} onClick={() => quantity(item, 1)}><FiPlus /></button></div></div>
              <button type="button" className="cart-remove" aria-label={`Remove ${item.name}`} onClick={() => save(cart.filter((row) => cartKey(row) !== cartKey(item)))}><FiTrash2 /></button>
            </article>)}</div>
            <footer className="cart-footer"><div className="cart-summary-row"><span>Subtotal</span><strong>{formatMoney(total)}</strong></div><p>Taxes and shipping calculated at checkout.</p><Link href="/checkout" onClick={() => setOpen(false)} className="cart-checkout">Proceed to Checkout <FiArrowRight /></Link></footer>
          </>}
        </section>
      </div>}
    </>
  );
}
