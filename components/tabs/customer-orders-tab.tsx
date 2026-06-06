"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Copy, Search, Archive, RotateCcw, CheckCircle2, Edit, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface Product {
  id: string
  name: string
  selling_price: number
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone_number: string
}

interface DeliveryCity {
  id: string
  city_name: string
  delivery_cost: number
}

interface OrderItem {
  product_id: string
  product_name: string
  quantity: string
  price: number
}

interface CustomerOrder {
  id: string
  order_reference: string
  customer_id: string
  customer_name: string
  order_date: string
  order_items: OrderItem[]
  subtotal: number
  delivery_cost: number
  total_amount: number
  status: string
  city?: string
  address?: string
  is_archived: boolean
  is_swapped?: boolean
  deletion_reason?: string
  status_comment?: string
}

const buildMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

const todayISO = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const isValidDateISO = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export default function CustomerOrdersTab() {
  const supabase = getSupabaseClient()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deliveryCities, setDeliveryCities] = useState<DeliveryCity[]>([])

  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<CustomerOrder[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [archivedSearchTerm, setArchivedSearchTerm] = useState("")

  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingOrder, setEditingOrder] = useState<CustomerOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ product_id: "", product_name: "", quantity: "", price: 0 }])

  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; orderId: string; comment: string }>({
    isOpen: false,
    orderId: "",
    comment: "",
  })

  const [swapModal, setSwapModal] = useState<{
    isOpen: boolean
    orderId: string
    orderItems: OrderItem[]
    suggestions: CustomerOrder[]
    selectedOrderId: string
  }>({
    isOpen: false,
    orderId: "",
    orderItems: [],
    suggestions: [],
    selectedOrderId: "",
  })

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: string; reason: string }>({
    isOpen: false,
    orderId: "",
    reason: "",
  })

  const [selectedStatsMonth, setSelectedStatsMonth] = useState<string>(() => buildMonthKey(new Date()))

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    city: "",
    address: "",
    order_date: todayISO(),
  })

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const filtered = orders.filter(
      (order) =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_reference.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredOrders(filtered)
  }, [searchTerm, orders])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [productsRes, customersRes, ordersRes, citiesRes] = await Promise.all([
        supabase.from("products").select("id, name, selling_price, production_cost").order("name"),
        supabase.from("customers").select("*").order("first_name"),
        supabase.from("customer_orders").select("*").order("order_date", { ascending: false }),
        supabase.from("delivery_cities").select("*").order("city_name"),
      ])

      setProducts(productsRes.data || [])
      setCustomers(customersRes.data || [])
      setDeliveryCities(citiesRes.data || [])

      const enrichedOrders = (ordersRes.data || []).map((order: any) => {
        const customer = (customersRes.data || []).find((c) => c.id === order.customer_id)
        return {
          ...order,
          customer_name: customer ? `${customer.first_name} ${customer.last_name}` : "Inconnu",
        }
      })

      setOrders(enrichedOrders)
      setFilteredOrders(enrichedOrders)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateOrderReference = () => `CMD-${Date.now().toString().slice(-9)}`

  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: "", product_name: "", quantity: "", price: 0 }])
  }

  const handleItemChange = (index: number, field: keyof OrderItem | string, value: string) => {
    const newItems = [...orderItems]
    if (field === "product_id") {
      const product = products.find((p) => p.id === value)
      newItems[index] = {
        ...newItems[index],
        product_id: value,
        product_name: product?.name || "",
        price: product?.selling_price || 0,
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setOrderItems(newItems)
  }

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => {
      const quantity = Number.parseFloat(item.quantity) || 0
      return sum + quantity * item.price
    }, 0)
  }

  const getDeliveryCost = () => {
    if (!formData.city) return 0
    const city = deliveryCities.find((c) => c.id === formData.city)
    return city?.delivery_cost || 0
  }

  const filterOrdersBySelectedMonth = (list: CustomerOrder[]) => {
    if (!selectedStatsMonth) return []
    const [yearStr, monthStr] = selectedStatsMonth.split("-")

    const year = Number.parseInt(yearStr, 10)
    const month = Number.parseInt(monthStr, 10) - 1
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 1)

    return list.filter((o) => {
      const d = new Date(o.order_date)
      return !Number.isNaN(d.getTime()) && d >= start && d < end
    })
  }

  const activeOrders = useMemo(
    () => filterOrdersBySelectedMonth(filteredOrders.filter((o) => !o.is_archived)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredOrders, selectedStatsMonth],
  )
  const archivedOrders = useMemo(
    () => filterOrdersBySelectedMonth(filteredOrders.filter((o) => o.is_archived && !o.is_swapped)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredOrders, selectedStatsMonth],
  )

  const filteredArchivedOrders = useMemo(() => {
    return archivedOrders.filter(
      (order) =>
        order.customer_name.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
        order.order_reference.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
        (order.deletion_reason && order.deletion_reason.toLowerCase().includes(archivedSearchTerm.toLowerCase())),
    )
  }, [archivedOrders, archivedSearchTerm])

  const pendingOrders = useMemo(() => activeOrders.filter((o) => o.status === "en attente"), [activeOrders])
  const swappedOrders = useMemo(() => filterOrdersBySelectedMonth(orders.filter((o) => o.is_swapped)), [orders, selectedStatsMonth])

  const confirmedOrders = useMemo(() => orders.filter((o) => o.status === "confirmée"), [orders])
  const archivedOrdersCount = confirmedOrders.filter((o) => o.is_archived).length
  const swappedOrdersCount = confirmedOrders.filter((o) => o.is_swapped).length

  const monthOptions = useMemo(() => {
    const set = new Set<string>()
    orders
      .filter((o) => o.status === "confirmée" && o.order_date)
      .forEach((o) => {
        const d = new Date(o.order_date)
        if (Number.isNaN(d.getTime())) return
        set.add(buildMonthKey(d))
      })
    set.add(buildMonthKey(new Date()))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [orders])

  const getOrdersForSelectedMonth = (monthKey: string) => {
    const [yearStr, monthStr] = monthKey.split("-")
    const year = Number.parseInt(yearStr, 10)
    const month = Number.parseInt(monthStr, 10) - 1
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 1)

    // Important: stats for "Annulées" / "Échangées" must not depend on confirmation status.
    // Swapped/archived flows can occur before status becomes "confirmée".
    return orders.filter((o) => {
      const d = new Date(o.order_date)
      return !Number.isNaN(d.getTime()) && d >= start && d < end
    })
  }


  const selectedMonthOrders = useMemo(() => getOrdersForSelectedMonth(selectedStatsMonth), [orders, selectedStatsMonth])

  const confirmedSelectedMonthOrders = selectedMonthOrders.filter((o) => o.status === "confirmée")

  // For the “Annulées / Échangées” counters, the tab already shows archived/swapped regardless of confirmation.
  // Match that behavior here: only filter by selected month, then apply archived/swapped logic.
  const currentMonthCanceledCount = selectedMonthOrders.filter((o) => o.is_archived && !o.is_swapped).length
  const currentMonthSwappedCount = selectedMonthOrders.filter((o) => o.is_swapped).length

  const overviewOrdersCountForSelectedMonth = confirmedSelectedMonthOrders.length
  const overviewSalesForSelectedMonth = confirmedSelectedMonthOrders.reduce((sum, order) => sum + (order.subtotal || 0), 0) -
    currentMonthCanceledCount * 200 -
    currentMonthSwappedCount * 100


  const confirmedOrdersForSelectedMonth = useMemo(
    () => orders.filter((o) => o.status === "confirmée"),
    [orders],
  )

  // Profit = sum over confirmed orders in the selected month of:
  // (product selling price - product manufacturing cost) * quantity
  

const productsById = useMemo(
  () =>
    Object.fromEntries(
      products.map((p) => [p.id, p])
    ),
  [products]
)

const overviewProfitForSelectedMonth = useMemo(() => {
  const [yearStr, monthStr] = selectedStatsMonth.split("-")

  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1

  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)

  return confirmedOrders.reduce((totalProfit, order) => {
    const d = new Date(order.order_date)

    if (
      Number.isNaN(d.getTime()) ||
      order.status !== "confirmée" ||
      d < start ||
      d >= end
    ) {
      return totalProfit
    }

    const orderProfit = (order.order_items ?? []).reduce(
      (profit, item) => {
        const product = productsById[item.product_id]

        if (!product) return profit

        return (
          profit +
          (Number(product.selling_price) -
            Number(product.production_cost)) *
            Number(item.quantity)
        )
      },
      0
    )

    return totalProfit + orderProfit
  }, 0)
}, [confirmedOrders, productsById, selectedStatsMonth])

  const getTopSellingProductsThisMonth = () => {
    const map = new Map<string, { product_id: string; name: string; units: number }>()

    selectedMonthOrders.forEach((order) => {
      ;(order.order_items || []).forEach((item) => {
        const productId = item.product_id
        if (!productId) return

        const qty = Number.parseFloat(item.quantity) || 0
        if (qty <= 0) return

        const existing = map.get(productId)
        if (existing) existing.units += qty
        else map.set(productId, { product_id: productId, name: item.product_name || "Produit", units: qty })
      })
    })

    const productsByUnits = Array.from(map.values()).sort((a, b) => b.units - a.units)
    const totalUnits = productsByUnits.reduce((sum, p) => sum + p.units, 0)

    if (totalUnits <= 0) {
      return {
        topProduct: null as null | { name: string; units: number },
        pieData: [] as { name: string; units: number; fill: string }[],
      }
    }

    const topProduct = productsByUnits[0]

    // Keep every product as a distinct slice with its own deterministic color.
    // This matches your requirement: "different colors on the pie chart, a color for every product".
    const palette = [
      "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#06b6d4", "#e11d48", "#84cc16", "#f59e0b",
      "#6366f1", "#14b8a6", "#ef4444", "#8b5cf6", "#10b981", "#fb7185", "#60a5fa", "#d946ef",
    ]

    const pieData = productsByUnits.map((p, idx) => {
      const fill = palette[idx % palette.length]
      return { name: p.name, units: p.units, fill }
    })

    return { topProduct: { name: topProduct.name, units: topProduct.units }, pieData }
  }

  const { topProduct, pieData } = useMemo(() => getTopSellingProductsThisMonth(), [selectedMonthOrders])

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    // If the UI hides order_date on create, we still must provide a value for DB.
    // Use today's date as a fallback.
    const orderDate = todayISO()


    if (!formData.first_name || !formData.last_name || !formData.phone_number) {
      alert("Veuillez remplir toutes les informations du client")
      return
    }

    if (!formData.city || !formData.address) {
      alert("Veuillez sélectionner une ville et entrer une adresse")
      return
    }

    // order_date is required by DB, but user feedback requests removing the date field when creating a new customer order


    if (orderItems.some((item) => !item.product_id || !item.quantity)) {
      alert("Veuillez remplir tous les articles de la commande")
      return
    }

    try {
      let customerId = ""

      if (isEditing && editingOrder) {
        customerId = editingOrder.customer_id

        const existingCustomer = customers.find((c) => c.id === customerId)
        if (existingCustomer) {
          if (
            existingCustomer.first_name !== formData.first_name ||
            existingCustomer.last_name !== formData.last_name ||
            existingCustomer.phone_number !== formData.phone_number
          ) {
            const { error: updateError } = await supabase
              .from("customers")
              .update({
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone_number: formData.phone_number,
              })
              .eq("id", customerId)

            if (updateError) throw updateError
          }
        }
      } else {
        const existingCustomer = customers.find(
          (c) =>
            c.phone_number === formData.phone_number &&
            c.first_name === formData.first_name &&
            c.last_name === formData.last_name,
        )

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone_number: formData.phone_number,
            })
            .select()

          if (customerError) throw customerError
          customerId = newCustomer?.[0]?.id
        }
      }

      const subtotal = calculateSubtotal()
      const deliveryCost = getDeliveryCost()
      const total = subtotal + deliveryCost

      if (isEditing && editingOrder) {
        const { error } = await supabase
          .from("customer_orders")
          .update({
            customer_id: customerId,
            order_date: formData.order_date,
            order_items: orderItems.filter((item) => item.product_id),
            subtotal,
            delivery_cost: deliveryCost,
            total_amount: total,
            city: formData.city,
            address: formData.address,
          })
          .eq("id", editingOrder.id)


        if (error) throw error
      } else {
        const { error } = await supabase.from("customer_orders").insert({
          customer_id: customerId,
          order_reference: generateOrderReference(),
          order_date: formData.order_date,
          order_items: orderItems.filter((item) => item.product_id),
          subtotal,
          delivery_cost: deliveryCost,
          total_amount: total,
          status: "en attente",
          city: formData.city,
          address: formData.address,
        })

        if (error) throw error
      }

      setFormData({
        first_name: "",
        last_name: "",
        phone_number: "",
        city: "",
        address: "",
        order_date: todayISO(),
      })
      setOrderItems([{ product_id: "", product_name: "", quantity: "", price: 0 }])
      setIsOpen(false)
      setIsEditing(false)
      setEditingOrder(null)
      await fetchData()
    } catch (error) {
      console.error("Error saving order:", error)
      alert("Impossible d'enregistrer la commande")
    }
  }

  const handleChangeStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === "confirmée" || newStatus === "en attente") {
      setStatusModal({ isOpen: true, orderId, comment: "" })
    }
  }

  const confirmStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("customer_orders")
        .update({ status: newStatus, status_comment: statusModal.comment })
        .eq("id", statusModal.orderId)

      if (error) throw error

      if (newStatus === "confirmée") {
        const order = orders.find((o) => o.id === statusModal.orderId)

        // Snapshot monthly totals/profit using DB logic
        // so historical months are stable when production_cost changes.
        if (order?.order_date) {
          const d = new Date(order.order_date)
          if (!Number.isNaN(d.getTime())) {
            const monthKey = buildMonthKey(d) // YYYY-MM
            const { error: finErr } = await supabase.rpc("upsert_monthly_financials", {
              p_month_key: monthKey,
            })
            if (finErr) console.error("Error upserting monthly_financials:", finErr)
          }
        }

        if (order && order.order_items) {
          for (const item of order.order_items) {
            const { data: productRawMaterials } = await supabase
              .from("product_raw_materials")
              .select("id, quantity")
              .eq("product_id", item.product_id)

            if (productRawMaterials) {
              for (const prm of productRawMaterials) {
                const newQuantity = Math.max(0, (prm.quantity || 0) - parseFloat(item.quantity))
                const newStatus = newQuantity < 20 ? "out_of_stock" : newQuantity <= 50 ? "low_stock" : "in_stock"

                await supabase
                  .from("product_raw_materials")
                  .update({ quantity: newQuantity, status: newStatus })
                  .eq("id", prm.id)
              }
            }
          }
        }
      }

      setStatusModal({ isOpen: false, orderId: "", comment: "" })
      await fetchData()
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const handleArchiveOrder = async (id: string) => {
    setDeleteModal({ isOpen: true, orderId: id, reason: "" })
  }

  const confirmArchive = async () => {
    if (!deleteModal.reason.trim()) {
      alert("Veuillez fournir une raison pour l'archivage")
      return
    }

    try {
      const { error } = await supabase
        .from("customer_orders")
        .update({ is_archived: true, deletion_reason: deleteModal.reason })
        .eq("id", deleteModal.orderId)

      if (error) throw error
      setDeleteModal({ isOpen: false, orderId: "", reason: "" })
      await fetchData()
    } catch (error) {
      console.error("Error archiving order:", error)
    }
  }

  const handleRestoreOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_orders")
        .update({ is_archived: false, deletion_reason: null })
        .eq("id", id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error restoring order:", error)
    }
  }

  const handleSwapOrder = async (id: string) => {
    const order = orders.find((o) => o.id === id)
    if (!order || !order.order_items) return

    const suggestions = orders.filter((o) => {
      if (o.id === id) return false
      if (o.is_archived) return false
      if (o.status !== "en attente") return false
      if (!o.order_items || o.order_items.length !== order.order_items.length) return false

      const sortedA = [...order.order_items].sort((a, b) => a.product_id.localeCompare(b.product_id))
      const sortedB = [...o.order_items].sort((a, b) => a.product_id.localeCompare(b.product_id))

      return sortedA.every((item, idx) => {
        const other = sortedB[idx]
        return item.product_id === other.product_id && item.quantity === other.quantity
      })
    })

    setSwapModal({
      isOpen: true,
      orderId: id,
      orderItems: order.order_items,
      suggestions,
      selectedOrderId: suggestions.length > 0 ? suggestions[0].id : "",
    })
  }

  const confirmSwap = async () => {
    const sourceOrder = orders.find((o) => o.id === swapModal.orderId)
    const targetOrder = orders.find((o) => o.id === swapModal.selectedOrderId)
    if (!sourceOrder || !targetOrder) {
      alert("Commande source ou cible introuvable")
      return
    }

    try {
      const swapDate = new Date().toISOString()
      const swapInfo = JSON.stringify({
        type: "swap_history",
        swapped_with_order_id: targetOrder.id,
        swapped_with_customer_name: targetOrder.customer_name,
        swapped_with_order_reference: targetOrder.order_reference,
        swap_date: swapDate,
      })

      const targetInfo = JSON.stringify({
        type: "swap_target",
        swap_source_order_id: sourceOrder.id,
        swap_source_customer_name: sourceOrder.customer_name,
        swap_source_order_reference: sourceOrder.order_reference,
        swap_date: swapDate,
      })

      const { error: sourceError } = await supabase
        .from("customer_orders")
        .update({
          is_swapped: true,
          is_archived: true,
          status_comment: swapInfo,
        })
        .eq("id", sourceOrder.id)

      if (sourceError) throw sourceError

      const { error: targetError } = await supabase
        .from("customer_orders")
        .update({ status_comment: targetInfo })
        .eq("id", targetOrder.id)

      if (targetError) throw targetError

      setSwapModal({ isOpen: false, orderId: "", orderItems: [], suggestions: [], selectedOrderId: "" })
      await fetchData()
    } catch (error: any) {
      console.error("[Swap] Error confirming swap:", error)
      alert(`Impossible d'effectuer l'échange: ${error?.message || "Erreur inconnue"}`)
    }
  }

  const getSwapSourceInfo = (orderId: string) => {
    const swappedOrder = orders.find((o) => {
      if (!o.status_comment) return false
      try {
        const data = JSON.parse(o.status_comment)
        return data.type === "swap_history" && data.swapped_with_order_id === orderId
      } catch {
        return false
      }
    })

    if (!swappedOrder) return null
    try {
      return JSON.parse(swappedOrder.status_comment as string)
    } catch {
      return null
    }
  }

  const getSwapHistory = (order: CustomerOrder) => {
    if (!order.status_comment) return null
    try {
      const data = JSON.parse(order.status_comment)
      return data.type === "swap_history" ? data : null
    } catch {
      return null
    }
  }

  const getSwapTargetInfo = (order: CustomerOrder) => {
    if (!order.status_comment) return null
    try {
      const data = JSON.parse(order.status_comment)
      return data.type === "swap_target" ? data : null
    } catch {
      return null
    }
  }

  const handleEditOrder = (order: CustomerOrder) => {
    const customer = customers.find((c) => c.id === order.customer_id)
    if (!customer) return

    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone_number: customer.phone_number,
      city: order.city || "",
      address: order.address || "",
      order_date: (order.order_date || "").split("T")[0],
    })

    setOrderItems(order.order_items || [{ product_id: "", product_name: "", quantity: "", price: 0 }])
    setEditingOrder(order)
    setIsEditing(true)
    setIsOpen(true)
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Commandes Clients</h2>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle Commande
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Modifier la Commande Client" : "Créer une Commande Client"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveOrder} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number">Téléphone</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_date">Date</Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryCities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.city_name} - {formatCurrency(city.delivery_cost)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rue, numéro, etc..."
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Produits</Label>
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select value={item.product_id} onValueChange={(value) => handleItemChange(index, "product_id", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {formatCurrency(product.selling_price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          placeholder="Quantité"
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        />
                      </div>
                      {orderItems.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="mt-3 bg-transparent">
                  + Ajouter Produit
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Sous-total</p>
                  <p className="text-lg font-bold">{formatCurrency(calculateSubtotal())}</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Livraison</p>
                  <p className="text-lg font-bold">{formatCurrency(getDeliveryCost())}</p>
                </div>
                <div className="bg-accent/10 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-accent">{formatCurrency(calculateSubtotal() + getDeliveryCost())}</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">{isEditing ? "Modifier" : "Créer"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active">Commandes ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">En Attente ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="archived">Archivées ({archivedOrders.length})</TabsTrigger>
          <TabsTrigger value="swaps">Swaps ({swappedOrders.length})</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <div className="w-32">
              <Select value={selectedStatsMonth} onValueChange={setSelectedStatsMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un mois" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((monthKey) => (
                    <SelectItem key={monthKey} value={monthKey}>
                      {new Date(monthKey + "-01").toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Chargement des commandes...</p>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {filteredOrders.filter((o) => !o.is_archived).length === 0
                  ? "Aucune commande encore. Créez votre première commande client."
                  : "Aucune commande ne correspond à votre recherche."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{order.customer_name}</CardTitle>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{order.order_reference}</code>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(order.order_reference)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          {(() => {
                            const swapSource = getSwapSourceInfo(order.id)
                            return swapSource ? (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">swap</span>
                            ) : null
                          })()}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.order_date).toLocaleDateString("fr-FR")} • {order.address}, {order.city}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          Statut:{" "}
                          <span className={order.status === "confirmée" ? "text-green-600" : "text-orange-600"}>{order.status}</span>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditOrder(order)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeStatus(order.id, order.status === "en attente" ? "confirmée" : "en attente")}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {order.status === "en attente" ? "Confirmer" : "Annuler"}
                        </Button>

                        {order.status === "en attente" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveOrder(order.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSwapOrder(order.id)}
                              className={
                                order.is_swapped
                                  ? "text-blue-600 border-blue-600 hover:text-blue-600 hover:bg-blue-50"
                                  : "text-muted-foreground border-muted-foreground hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50"
                              }
                              title={order.is_swapped ? "Déjà échangé" : "Marquer comme échangé"}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              {order.is_swapped ? "Échangé" : "swap"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {order.order_items?.length ? (
                      <div className="bg-muted p-3 rounded text-sm">
                        <p className="font-semibold mb-2">Produits:</p>
                        <ul className="space-y-1 text-xs">
                          {order.order_items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.product_name}: {item.quantity} x {formatCurrency(item.price)} = {formatCurrency(Number.parseFloat(item.quantity) * item.price)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {order.status_comment && !(() => {
                      try {
                        const data = JSON.parse(order.status_comment as string)
                        return data.type === "swap_target" || data.type === "swap_history"
                      } catch {
                        return false
                      }
                    })() && (
                      <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
                        <p className="font-semibold text-blue-900 mb-1">Commentaire:</p>
                        <p className="text-blue-800 text-xs">{order.status_comment}</p>
                      </div>
                    )}

                    {(() => {
                      const swapTarget = getSwapTargetInfo(order)
                      if (!swapTarget) return null

                      return (
                        <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
                          <p className="font-semibold text-blue-900 mb-2">swap</p>
                          <div className="space-y-1 text-xs text-blue-800">
                            <p>
                              <strong>Client source:</strong> {swapTarget.swap_source_customer_name}
                            </p>
                            <p>
                              <strong>Réf. commande source:</strong> {swapTarget.swap_source_order_reference}
                            </p>
                            <p>
                              <strong>Date de l'échange:</strong>{" "}
                              {new Date(swapTarget.swap_date).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sous-total</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Livraison</span>
                        <span>{formatCurrency(order.delivery_cost)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span className="text-accent">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">Aucune commande en attente</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <Card key={order.id} className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{order.customer_name}</CardTitle>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{order.order_reference}</code>
                          {(() => {
                            const swapSource = getSwapSourceInfo(order.id)
                            return swapSource ? (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">swap</span>
                            ) : null
                          })()}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.order_date).toLocaleDateString("fr-FR")} • {order.address}, {order.city}
                        </p>
                      </div>

                      <Button variant="default" size="sm" onClick={() => handleChangeStatus(order.id, "confirmée")}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirmer
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {order.order_items?.length ? (
                      <div className="bg-muted p-3 rounded text-sm">
                        <p className="font-semibold mb-2">Produits:</p>
                        <ul className="space-y-1 text-xs">
                          {order.order_items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.product_name}: {item.quantity} x {formatCurrency(item.price)} = {formatCurrency(Number.parseFloat(item.quantity) * item.price)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {(() => {
                      const swapTarget = getSwapTargetInfo(order)
                      if (!swapTarget) return null

                      return (
                        <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
                          <p className="font-semibold text-blue-900 mb-2">swap</p>
                          <div className="space-y-1 text-xs text-blue-800">
                            <p>
                              <strong>Client source:</strong> {swapTarget.swap_source_customer_name}
                            </p>
                            <p>
                              <strong>Réf. commande source:</strong> {swapTarget.swap_source_order_reference}
                            </p>
                            <p>
                              <strong>Date de l'échange:</strong>{" "}
                              {new Date(swapTarget.swap_date).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sous-total</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Livraison</span>
                        <span>{formatCurrency(order.delivery_cost)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span className="text-accent">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les commandes archivées..."
              value={archivedSearchTerm}
              onChange={(e) => setArchivedSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {archivedOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {orders.filter((o) => o.is_archived).length === 0 ? "Aucune commande archivée" : "Aucune commande archivée ne correspond à votre recherche."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredArchivedOrders.map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.customer_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{new Date(order.order_date).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleRestoreOrder(order.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurer
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="bg-destructive/10 p-2 rounded text-sm">
                      <p className="text-destructive text-xs font-semibold mb-1">Raison d'archivage:</p>
                      <p className="text-xs">{order.deletion_reason}</p>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-muted-foreground text-sm">Total</p>
                      <p className="text-xl font-bold text-accent">{formatCurrency(order.total_amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="swaps" className="space-y-4">
          {swappedOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">Aucune commande échangée</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {swappedOrders.map((order) => {
                const swapHistory = getSwapHistory(order)
                return (
                  <Card key={order.id} className="opacity-75 border-blue-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{order.customer_name}</CardTitle>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{order.order_reference}</code>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Échangé</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{new Date(order.order_date).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {swapHistory ? (
                        <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
                          <p className="font-semibold text-blue-900 mb-2">Historique de l'échange</p>
                          <div className="space-y-1 text-xs text-blue-800">
                            <p>
                              <strong>Client remplaçant:</strong> {swapHistory.swapped_with_customer_name}
                            </p>
                            <p>
                              <strong>Réf. commande remplaçante:</strong> {swapHistory.swapped_with_order_reference}
                            </p>
                            <p>
                              <strong>Date de l'échange:</strong>{" "}
                              {new Date(swapHistory.swap_date).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {order.order_items?.length ? (
                        <div className="bg-muted p-3 rounded text-sm">
                          <p className="font-semibold mb-2">Produits échangés:</p>
                          <ul className="space-y-1 text-xs">
                            {order.order_items.map((item: any, idx: number) => (
                              <li key={idx}>
                                {item.product_name}: {item.quantity} x {formatCurrency(item.price)} = {formatCurrency(Number.parseFloat(item.quantity) * item.price)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sous-total</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Livraison</span>
                          <span>{formatCurrency(order.delivery_cost)}</span>
                        </div>
                        <div className="flex justify-between font-bold mt-1">
                          <span>Total</span>
                          <span className="text-accent">{formatCurrency(order.total_amount)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-lg font-semibold">Statistiques</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez un mois pour mettre à jour l'analyse.</p>
              </div>
            </div>

            <div>
              <Select value={selectedStatsMonth} onValueChange={setSelectedStatsMonth}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Choisir un mois" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((monthKey) => (
                    <SelectItem key={monthKey} value={monthKey}>
                      {new Date(monthKey + "-01").toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <Card className="lg:col-span-1 overflow-hidden">
              <div className="bg-gradient-to-br from-blue-50 via-background to-background p-6 border-b">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Vue d'ensemble</CardTitle>
                </CardHeader>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-lg bg-white/60 border p-4">
                    <div className="text-xs text-muted-foreground">Total des commandes</div>
                    <div className="text-3xl font-bold text-blue-700">{overviewOrdersCountForSelectedMonth}</div>
                  </div>

                  <div className="rounded-lg bg-white/60 border p-4">
                    <div className="text-xs text-muted-foreground">Ventes totales</div>
                    <div className="text-3xl font-bold text-emerald-700">{formatCurrency(overviewSalesForSelectedMonth)}</div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-orange-50 p-3">
                    <p className="text-xs text-orange-700">Annulées</p>
                    <p className="text-xl font-bold text-orange-600">{currentMonthCanceledCount}</p>
                  </div>
                  <div className="rounded-lg border bg-blue-50 p-3">
                    <p className="text-xs text-blue-700">Échangées</p>
                    <p className="text-xl font-bold text-blue-600">{currentMonthSwappedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>


            <Card className="lg:col-span-2 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">Produits les plus achetés</CardTitle>
                </CardHeader>
              </div>

              <CardContent className="p-6">
                {pieData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-1">
                      <ChartContainer
                        config={{
                          units: { label: "Unités", color: "hsl(var(--chart-1))" },
                        }}
                        className="w-full"
                      >
                        <div className="flex items-center justify-center">
                          <PieChart width={320} height={240}>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie
                              data={pieData}
                              dataKey="units"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={92}
                              paddingAngle={2}
                              stroke="rgba(255,255,255,0.95)"
                              strokeWidth={2}
                              fill="#8884d8"
                            >
                              {pieData.map((entry, idx) => (
                                <cell key={`cell-${idx}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </div>
                      </ChartContainer>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Best seller</p>
                            <p className="mt-1 text-lg font-bold">{topProduct?.name || "-"}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Unités</div>
                            <div className="text-2xl font-bold text-purple-700">{topProduct?.units?.toLocaleString("fr-FR") || 0}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Répartition (unités)</p>
                          <p className="text-xs text-muted-foreground">(du mois sélectionné)</p>
                        </div>

                        <div className="mt-3 space-y-2">
                          {pieData.map((slice) => (
                            <div key={slice.name} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.fill }} />
                                <span className="text-sm truncate">{slice.name}</span>
                              </div>
                              <div className="text-sm font-medium tabular-nums">{slice.units.toLocaleString("fr-FR")}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-10">Aucune vente ce mois-ci</p>
                )}
              </CardContent>
            </Card>
          </div>

        <div className="flex gap-6">
          <div className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CA du mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mois sélectionné</p>
                    <p className="font-medium">{new Date(selectedStatsMonth + "-01").toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {overviewOrdersCountForSelectedMonth} commande{overviewOrdersCountForSelectedMonth > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="sm:text-right">
<p className="text-sm text-muted-foreground">Ventes</p>
<p className="font-bold text-accent text-xl">{formatCurrency(overviewSalesForSelectedMonth)}</p>
                  </div>
                </div>

                {overviewOrdersCountForSelectedMonth === 0 && (
                  <p className="text-muted-foreground text-center py-4">Aucune donnée disponible</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">bénéfice du mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mois sélectionné</p>
                    <p className="font-medium">{new Date(selectedStatsMonth + "-01").toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {overviewOrdersCountForSelectedMonth} commande{overviewOrdersCountForSelectedMonth > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="sm:text-right">
<p className="text-sm text-muted-foreground">Profit</p>
                    <p className="font-bold text-accent text-xl">{formatCurrency(overviewProfitForSelectedMonth)}</p>
                  </div>
                </div>

                {overviewOrdersCountForSelectedMonth === 0 && (
                  <p className="text-muted-foreground text-center py-4">Aucune donnée disponible</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </TabsContent>
      </Tabs>

      {statusModal.isOpen && (
        <Dialog
          open={statusModal.isOpen}
          onOpenChange={(open) => !open && setStatusModal({ isOpen: false, orderId: "", comment: "" })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Changer le Statut de la Commande</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="comment">Commentaire (obligatoire)</Label>
                <Textarea
                  id="comment"
                  value={statusModal.comment}
                  onChange={(e) => setStatusModal({ ...statusModal, comment: e.target.value })}
                  placeholder="Expliquez le changement de statut..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setStatusModal({ isOpen: false, orderId: "", comment: "" })}>
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    const order = orders.find((o) => o.id === statusModal.orderId)
                    const newStatus = order?.status === "en attente" ? "confirmée" : "en attente"
                    confirmStatusChange(newStatus)
                  }}
                >
                  Confirmer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {swapModal.isOpen && (
        <Dialog
          open={swapModal.isOpen}
          onOpenChange={(open) =>
            !open &&
            setSwapModal({
              isOpen: false,
              orderId: "",
              orderItems: [],
              suggestions: [],
              selectedOrderId: "",
            })
          }
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Échanger la Commande</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-semibold mb-2">Produits de la commande actuelle:</p>
                <ul className="space-y-1 text-xs">
                  {swapModal.orderItems.map((item, idx) => (
                    <li key={idx}>
                      {item.product_name}: {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>

              {swapModal.suggestions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune commande en attente ne correspond exactement aux mêmes produits et quantités.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Sélectionnez une commande à échanger:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {swapModal.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`p-3 rounded border cursor-pointer transition-colors ${
                          swapModal.selectedOrderId === suggestion.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-border hover:border-blue-300"
                        }`}
                        onClick={() => setSwapModal({ ...swapModal, selectedOrderId: suggestion.id })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{suggestion.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.order_reference}</p>
                          </div>
                          {swapModal.selectedOrderId === suggestion.id && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {suggestion.order_items?.map((item: any, idx: number) => (
                            <span key={idx}>
                              {item.product_name}: {item.quantity}
                              {idx < (suggestion.order_items?.length || 0) - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSwapModal({ isOpen: false, orderId: "", orderItems: [], suggestions: [], selectedOrderId: "" })}
                >
                  Annuler
                </Button>
                <Button onClick={confirmSwap} disabled={swapModal.suggestions.length === 0 || !swapModal.selectedOrderId}>
                  Confirmer l'échange
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {deleteModal.isOpen && (
        <Dialog open={deleteModal.isOpen} onOpenChange={(open) => !open && setDeleteModal({ isOpen: false, orderId: "", reason: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archiver la Commande</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Raison de l'archivage (obligatoire)</Label>
                <Textarea
                  id="reason"
                  value={deleteModal.reason}
                  onChange={(e) => setDeleteModal({ ...deleteModal, reason: e.target.value })}
                  placeholder="Expliquez pourquoi vous archivez cette commande..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, orderId: "", reason: "" })}>
                  Annuler
                </Button>
                <Button variant="destructive" onClick={confirmArchive}>
                  Archiver
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

