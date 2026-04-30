"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import ProductsTab from "./tabs/products-tab"
import SupplierOrdersTab from "./tabs/supplier-orders-tab"
import CustomerOrdersTab from "./tabs/customer-orders-tab"
import BusinessOrdersTab from "./tabs/business-orders-tab"
import SettingsTab from "./tabs/settings-tab"
import OverviewTab from "./tabs/overview-tab"
import AdvertisingTab from "./tabs/advertising-tab"
import StockTab from "./tabs/stock-tab"
import { LogOut, Settings, Megaphone, Package } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 shadow-sm">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestionnaire de Soins</h1>
            <p className="text-sm text-muted-foreground">Gérez vos opérations commerciales</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex flex-wrap gap-2 p-4 overflow-x-auto">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            size="sm"
          >
            Aperçu
          </Button>
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            onClick={() => setActiveTab("products")}
            size="sm"
          >
            Produits
          </Button>
          <Button
            variant={activeTab === "supplier-orders" ? "default" : "outline"}
            onClick={() => setActiveTab("supplier-orders")}
            size="sm"
          >
            Commandes Fournisseurs
          </Button>
          <Button
            variant={activeTab === "customer-orders" ? "default" : "outline"}
            onClick={() => setActiveTab("customer-orders")}
            size="sm"
          >
            Commandes Clients
          </Button>
          <Button
            variant={activeTab === "business-orders" ? "default" : "outline"}
            onClick={() => setActiveTab("business-orders")}
            size="sm"
          >
            Commandes Business
          </Button>
<Button
            variant={activeTab === "advertising" ? "default" : "outline"}
            onClick={() => setActiveTab("advertising")}
            size="sm"
            className="flex items-center gap-2"
          >
            <Megaphone className="h-4 w-4" />
            Publicités
          </Button>
          <Button
            variant={activeTab === "stock" ? "default" : "outline"}
            onClick={() => setActiveTab("stock")}
            size="sm"
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Stock
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "outline"}
            onClick={() => setActiveTab("settings")}
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "supplier-orders" && <SupplierOrdersTab />}
        {activeTab === "customer-orders" && <CustomerOrdersTab />}
        {activeTab === "business-orders" && <BusinessOrdersTab />}
{activeTab === "advertising" && <AdvertisingTab />}
        {activeTab === "stock" && <StockTab />}
        {activeTab === "settings" && <SettingsTab />}
      </main>
    </div>
  )
}
