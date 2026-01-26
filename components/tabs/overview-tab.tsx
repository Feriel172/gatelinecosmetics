"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ShoppingCart, DollarSign, Calendar, AlertCircle } from 'lucide-react'

export default function OverviewTab() {
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    monthlyOrders: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    currentDate: new Date(),
  })
  const [isLoading, setIsLoading] = useState(true)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      // Fetch all data
      const [productsRes, customersRes, ordersRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("customer_orders").select("*"),
      ])

      console.log("[v0] Orders response:", ordersRes.data)
      console.log("[v0] Products response:", productsRes.data)
      console.log("[v0] Current month/year:", currentMonth, currentYear)

      // Calculate metrics
      let monthlyRevenue = 0
      let monthlyProfit = 0
      let monthlyOrders = 0
      let pendingOrders = 0

      const ordersData = ordersRes.data || []
      const productsData = productsRes.data || []

      const productsMap = new Map()
      productsData.forEach((p: any) => {
        productsMap.set(p.id, p)
      })

      ordersData.forEach((order: any) => {
        const orderDate = new Date(order.order_date)
        const orderMonth = orderDate.getMonth() + 1
        const orderYear = orderDate.getFullYear()

        console.log(
          "[v0] Order:",
          order.order_reference,
          "Status:",
          order.status,
          "Date:",
          orderMonth,
          "/",
          orderYear,
          "Month Match:",
          orderMonth === currentMonth && orderYear === currentYear,
        )

        if (orderMonth === currentMonth && orderYear === currentYear) {
          if (order.status === "confirmée" && !order.is_archived) {
            const ca = (order.total_amount || 0) - (order.delivery_cost || 0)
            console.log("[v0] Confirmed order CA:", ca, "Total:", order.total_amount, "Delivery:", order.delivery_cost)
            monthlyRevenue += ca
            monthlyOrders++

            const items = order.order_items || []
            console.log("[v0] Order items:", items)

            items.forEach((item: any) => {
              const product = productsMap.get(item.product_id)
              console.log("[v0] Item product_id:", item.product_id, "Product found:", !!product)

              if (product) {
                const profitPerUnit = product.selling_price - product.production_cost
                const itemProfit = profitPerUnit * (item.quantity || 1)
                console.log(
                  "[v0] Profit calculation - Selling:",
                  product.selling_price,
                  "Production:",
                  product.production_cost,
                  "Profit per unit:",
                  profitPerUnit,
                  "Quantity:",
                  item.quantity,
                  "Item profit:",
                  itemProfit,
                )
                monthlyProfit += itemProfit
              }
            })
          } else if (order.status === "en attente" && !order.is_archived) {
            console.log("[v0] Pending order:", order.order_reference)
            pendingOrders++
          }
        }
      })

      console.log(
        "[v0] Final metrics - Revenue:",
        monthlyRevenue,
        "Profit:",
        monthlyProfit,
        "Orders:",
        monthlyOrders,
        "Pending:",
        pendingOrders,
      )

      setMetrics({
        totalProducts: productsData.filter((p: any) => !p.is_archived).length || 0,
        monthlyRevenue,
        monthlyProfit,
        monthlyOrders,
        totalCustomers: customersRes.data?.length || 0,
        pendingOrders,
        currentDate: now,
      })
    } catch (error) {
      console.error("Error fetching metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Date and title section */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border border-border">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Tableau de Bord</h2>
        </div>
        <p className="text-lg text-muted-foreground capitalize">{formatDate(metrics.currentDate)}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Monthly Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              CA du Mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">{formatCurrency(metrics.monthlyRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-2">Chiffre d'affaires mensuel (confirmé)</p>
          </CardContent>
        </Card>

        {/* Monthly Profit */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Bénéfice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${metrics.monthlyProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(metrics.monthlyProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Bénéfice net mensuel</p>
          </CardContent>
        </Card>

        {/* Monthly Orders */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{metrics.monthlyOrders}</p>
            <p className="text-xs text-muted-foreground mt-2">Commandes confirmées ce mois</p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card className="hover:shadow-md transition-shadow border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Commandes en Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{metrics.pendingOrders}</p>
            <p className="text-xs text-muted-foreground mt-2">Commandes en attente de confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{metrics.totalProducts}</p>
            <p className="text-sm text-muted-foreground mt-2">Produits actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panier Moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">
              {metrics.monthlyOrders > 0
                ? formatCurrency(metrics.monthlyRevenue / metrics.monthlyOrders)
                : formatCurrency(0)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Par commande confirmée</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
