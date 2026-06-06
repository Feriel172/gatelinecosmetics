"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Copy, Search, Archive, RotateCcw, Edit } from "lucide-react"
import { Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


interface Product {
  id: string
  name: string
  selling_price: number
  production_cost?: number
}


interface Professionnel {
  id: string
  type: 'cosmetics' | 'pharmacies'
  name: string
  address: string
  city: string
  phone: string
}

interface BusinessOrderItem {
  product_id: string
  product_name: string
  quantity: string
  price: number
}

interface BusinessOrder {
  id: string
  order_reference: string
  professionnel_id: string
  professionnel_name: string
  order_date: string
  order_items: BusinessOrderItem[]
  subtotal: number
  total_amount: number
  comments?: string
  is_archived: boolean
  deletion_reason?: string
}

export default function BusinessOrdersTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [professionnels, setProfessionnels] = useState<Professionnel[]>([])
  const [orders, setOrders] = useState<BusinessOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<BusinessOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingOrder, setEditingOrder] = useState<BusinessOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orderItems, setOrderItems] = useState<BusinessOrderItem[]>([
    { product_id: "", product_name: "", quantity: "", price: 0 },
  ])

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: string; reason: string }>({
    isOpen: false,
    orderId: "",
    reason: "",
  })
  const [formData, setFormData] = useState({
    professionnel_id: "",
    order_date: new Date().toISOString().split('T')[0],
    comments: "",
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const filtered = orders.filter(
      (order) =>
        order.professionnel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_reference.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredOrders(filtered)
  }, [searchTerm, orders])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [productsRes, professionnelsRes, ordersRes] = await Promise.all([
supabase.from("products").select("id, name, selling_price, production_cost").order("name"),
        supabase.from("professionnels").select("*").order("name"),
        supabase.from("professionnels_orders").select("*").order("order_date", { ascending: false }),
      ])

      setProducts(productsRes.data || [])
      setProfessionnels(professionnelsRes.data || [])

      const enrichedOrders = (ordersRes.data || []).map((order: any) => {
        const professionnel = (professionnelsRes.data || []).find((p) => p.id === order.professionnel_id)
        return {
          ...order,
          professionnel_name: professionnel ? professionnel.name : "Inconnu",
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

  const generateOrderReference = () => {
    return `BUS-${Date.now().toString().slice(-9)}`
  }

  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: "", product_name: "", quantity: "", price: 0 }])
  }

  const handleItemChange = (index: number, field: string, value: string) => {
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

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.professionnel_id) {
      alert("Veuillez sélectionner un professionnel")
      return
    }

    if (!formData.order_date) {
      alert("Veuillez sélectionner une date de commande")
      return
    }

    if (orderItems.some((item) => !item.product_id || !item.quantity)) {
      alert("Veuillez remplir tous les articles de la commande")
      return
    }

    try {
      const subtotal = calculateSubtotal()
      const total = subtotal

      console.log("Saving order with data:", {
        professionnel_id: formData.professionnel_id,
        order_reference: generateOrderReference(),
        order_date: formData.order_date,
        order_items: orderItems.filter((item) => item.product_id),
        subtotal,
        total_amount: total,
        comments: formData.comments || null,
      })

      if (isEditing && editingOrder) {
        // Update existing order
        console.log("Updating order:", editingOrder.id)
        const { data, error } = await supabase
          .from("professionnels_orders")
          .update({
            professionnel_id: formData.professionnel_id,
            order_date: formData.order_date,
            order_items: orderItems.filter((item) => item.product_id),
            subtotal,
            total_amount: total,
            comments: formData.comments || null,
          })
          .eq("id", editingOrder.id)
          .select()

        console.log("Update result:", { data, error })
        if (error) throw error
      } else {
        // Create new order
        console.log("Creating new order")
        const { data, error } = await supabase.from("professionnels_orders").insert({
          professionnel_id: formData.professionnel_id,
          order_reference: generateOrderReference(),
          order_date: formData.order_date,
          order_items: orderItems.filter((item) => item.product_id),
          subtotal,
          total_amount: total,
          comments: formData.comments || null,
        } as any)
        .select()

        console.log("Insert result:", { data, error })
        if (error) throw error
      }

      setFormData({
        professionnel_id: "",
        order_date: new Date().toISOString().split('T')[0],
        comments: "",
      })
      setOrderItems([{ product_id: "", product_name: "", quantity: "", price: 0 }])
      setIsOpen(false)
      setIsEditing(false)
      setEditingOrder(null)
      await fetchData()
    } catch (error) {
      console.error("Error saving order:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      console.error("Error type:", typeof error)
      console.error("Error keys:", error ? Object.keys(error) : 'No error object')

      // Try to extract more specific error information
      let errorMessage = 'Erreur inconnue'
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = (error as any).message
        } else if ('error' in error) {
          errorMessage = (error as any).error
        } else if ('details' in error) {
          errorMessage = (error as any).details
        }
      }

      alert(`Impossible d'enregistrer la commande: ${errorMessage}`)
    }
  }



  const handleArchiveOrder = async (id: string) => {
    setDeleteModal({ isOpen: true, orderId: id, reason: "" })
  }

  const confirmArchive = async () => {
    if (!deleteModal.reason.trim()) {
      alert("Veuillez fournir une raison pour l'annulation")
      return
    }

    try {
      const { error } = await supabase
        .from("professionnels_orders")
        .update({ is_archived: true, deletion_reason: deleteModal.reason })
        .eq("id", deleteModal.orderId)

      if (error) throw error
      setDeleteModal({ isOpen: false, orderId: "", reason: "" })
      await fetchData()
    } catch (error) {
              console.error("Error cancelling order:", error)
    }
  }

  const handleRestoreOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("professionnels_orders")
        .update({ is_archived: false, deletion_reason: null })
        .eq("id", id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error restoring order:", error)
    }
  }

  const handleEditOrder = (order: BusinessOrder) => {
    setFormData({
      professionnel_id: order.professionnel_id,
      order_date: order.order_date.split('T')[0],
      comments: order.comments || "",
    })
    setOrderItems(order.order_items || [{ product_id: "", product_name: "", quantity: "", price: 0 }])
    setEditingOrder(order)
    setIsEditing(true)
    setIsOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount)
  }

  const [selectedActiveMonth, setSelectedActiveMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  // Front-end only payment status (no DB changes)
  // Payment status for the CREATE/EDIT form (UI only)
  const [paymentStatus, setPaymentStatus] = useState<"total" | "partial">("total")
  const [paidAmount, setPaidAmount] = useState<number>(0)

  const [paymentStatusByOrderId, setPaymentStatusByOrderId] = useState<Record<string, "total" | "partial">>({})
  const [paidAmountByOrderId, setPaidAmountByOrderId] = useState<Record<string, number>>({})


  const getPaidAmount = (order: BusinessOrder) => {
    const status = paymentStatusByOrderId[order.id] ?? "total"
    if (status !== "partial") return order.total_amount
    const raw = paidAmountByOrderId[order.id]
    const n = typeof raw === "number" && Number.isFinite(raw) ? raw : 0
    return Math.max(0, Math.min(order.total_amount ?? 0, n))
  }

  const getRemainingAmount = (order: BusinessOrder) => {
    const paid = getPaidAmount(order)
    return Math.max(0, (order.total_amount ?? 0) - paid)
  }



  const filterOrdersBySelectedMonth = (list: BusinessOrder[]) => {
    if (!selectedActiveMonth) return list

    const [yStr, mStr] = selectedActiveMonth.split("-")
    const y = Number.parseInt(yStr, 10)
    const mIndex = Number.parseInt(mStr, 10) - 1

    const start = new Date(y, mIndex, 1)
    const end = new Date(y, mIndex + 1, 1)

    return list.filter((o) => {
      const d = new Date(o.order_date)
      if (Number.isNaN(d.getTime())) return false
      return d >= start && d < end
    })
  }

  const activeOrders = filterOrdersBySelectedMonth(filteredOrders.filter((o) => !o.is_archived))
  const archivedOrders = filterOrdersBySelectedMonth(filteredOrders.filter((o) => o.is_archived))


  const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0)
  const totalOrders = orders.length

  // Month selector for statistics
  const [selectedStatsMonth, setSelectedStatsMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const monthOptions = (() => {
    const set = new Set<string>()
    orders.forEach((order) => {
      const d = new Date(order.order_date)
      if (Number.isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      set.add(key)
    })
    // Ensure current month always exists
    const now = new Date()
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  })()

  const monthStats = (() => {
    if (!selectedStatsMonth) return { count: 0, sales: 0, profit: 0 }

    const [yStr, mStr] = selectedStatsMonth.split('-')
    const y = Number.parseInt(yStr, 10)
    const mIndex = Number.parseInt(mStr, 10) - 1
    const start = new Date(y, mIndex, 1)
    const end = new Date(y, mIndex + 1, 1)

    const filtered = orders.filter((o) => {
      const raw = o.order_date
      const d = new Date(raw)
      const isValid = !Number.isNaN(d.getTime())
      if (!isValid) return false
      return d >= start && d < end
    })

    const sales = filtered.reduce((sum, o) => sum + (o.total_amount || 0), 0)

    // Monthly profit for business orders:
    // sum over all orders in the selected month of:
    //   (unitSellingPriceRecordedOnOrder - product.production_cost) * quantity
    //
    // In this UI, each order item stores `price` (selling price recorded on creation) and `quantity`.
    // We need to join `item.product_id` with `products` to get `production_cost`.
    const productsMap = Object.fromEntries(products.map((p) => [p.id, p])) as Record<
      string,
      Product
    >

    const profit = filtered.reduce((orderSum, order) => {
      const items = order.order_items || []
      return (
        orderSum +
        items.reduce((itemSum, item: any) => {
          const qty = Number.parseFloat(item.quantity) || 0
          const unitSellingPrice = Number.parseFloat(String(item.price ?? 0)) || 0
          const product = productsMap[item.product_id]
          // production_cost is optional in types because the UI fetch may not always include it.
          // default to 0 when missing.
          const productionCost = Number((product as any)?.production_cost ?? 0)

          return itemSum + (unitSellingPrice - productionCost) * qty
        }, 0)
      )
    }, 0)


    return {
      count: filtered.length,
      sales,
      profit,
    }
  })()

  // Keep variable names consistent with the UI below (same concept as customer-orders-tab).
  const overviewOrdersCountForSelectedMonth = monthStats.count
  const overviewSalesForSelectedMonth = monthStats.sales
  const overviewProfitForSelectedMonth = monthStats.profit



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Commandes Business</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle Commande Business
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Modifier la Commande Business" : "Créer une Commande Business"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveOrder} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="professionnel">Professionnel *</Label>
                  <Select
                    value={formData.professionnel_id}
                    onValueChange={(value) => setFormData({ ...formData, professionnel_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un professionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionnels.map((professionnel) => (
                        <SelectItem key={professionnel.id} value={professionnel.id}>
                          {professionnel.name} ({professionnel.type === 'cosmetics' ? 'Cosmétiques' : 'Pharmacies'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="order_date">Date de Commande *</Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="comments">Commentaires</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Commentaires sur la commande..."
                  rows={3}
                />
              </div>

              {/* Payment status (front-end only) */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Label className="w-40" htmlFor="payment_status">Statut paiement</Label>
                  <Select
                    value={"total"}
                    onValueChange={(value) => {
                      // The UI-only logic for partially paid is not implemented yet.
                      // Keep dropdown selectable without throwing.
                      if (value === "partial") {
                        // Temporarily allow selection until the partial-payment UI is implemented.
                        // Keep the value selectable and do not block the user.
                      }
                    }}
                  >
                    <SelectTrigger id="payment_status" className="flex-1">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">total paid</SelectItem>
                      <SelectItem value="partial">Partially Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


              <div>
                <Label className="mb-3 block">Produits</Label>
                <div className="flex gap-2 mb-2 text-xs text-muted-foreground">
                  <span className="flex-1">Produit</span>
                  <span className="w-24 text-center">Prix de Vente</span>
                  <span className="w-24 text-center">Quantité</span>
                  <span className="w-8"></span>
                </div>
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select
                          value={item.product_id}
                          onValueChange={(value) => handleItemChange(index, "product_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          placeholder="Prix"
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, "price", e.target.value)}
                        />
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="mt-3 bg-transparent"
                >
                  + Ajouter Produit
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Sous-total</p>
                  <p className="text-lg font-bold">{formatCurrency(calculateSubtotal())}</p>
                </div>
                <div className="bg-accent/10 p-3 rounded">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-accent">
                    {formatCurrency(calculateSubtotal())}
                  </p>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Commandes ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="archived">Annulées ({archivedOrders.length})</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center gap-4">
  <div className="relative flex-1 min-w-0">
    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Rechercher une commande..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>

  <Select value={selectedActiveMonth} onValueChange={setSelectedActiveMonth}>
    <SelectTrigger className="w-[220px] shrink-0">
      <SelectValue placeholder="Choisir un mois" />
    </SelectTrigger>
    <SelectContent>
      {monthOptions.map((monthKey) => (
        <SelectItem key={monthKey} value={monthKey}>
          {new Date(monthKey + "-01").toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
          })}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

          

          {isLoading ? (
            <p className="text-muted-foreground">Chargement des commandes...</p>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {orders.filter((o) => !o.is_archived).length === 0
                  ? "Aucune commande business encore. Créez votre première commande business."
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
                          <CardTitle className="text-lg">{order.professionnel_name}</CardTitle>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{order.order_reference}</code>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(order.order_reference)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.order_date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveOrder(order.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <p className="font-semibold mb-2">Produits:</p>
                        <ul className="space-y-1 text-xs">
                          {order.order_items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.product_name}: {item.quantity} x {formatCurrency(item.price)} ={" "}
                              {formatCurrency(Number.parseFloat(item.quantity) * item.price)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {order.comments && (
                      <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
                        <p className="font-semibold text-blue-900 mb-1">Commentaires:</p>
                        <p className="text-blue-800 text-xs">{order.comments}</p>
                      </div>
                    )}
                    <div className="border-t border-border pt-3">
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
          {archivedOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">Aucune commande annulée</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archivedOrders.map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.professionnel_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.order_date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleRestoreOrder(order.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurer
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-destructive/10 p-2 rounded text-sm">
                      <p className="text-destructive text-xs font-semibold mb-1">Raison d'annulation:</p>
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

              
            </Card>


            <Card className="lg:col-span-2 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">Produits les plus achetés</CardTitle>
                </CardHeader>
              </div>

              <CardContent className="p-6">
                {(() => {
                  // Top products by units sold for the selected month.
                  // Matches the logic/UX expectation: rank by sum(quantity).
                  if (!selectedStatsMonth) {
                    return <p className="text-muted-foreground text-center py-10">Aucune donnée disponible</p>
                  }

                  const [yStr, mStr] = selectedStatsMonth.split("-")
                  const y = Number.parseInt(yStr, 10)
                  const mIndex = Number.parseInt(mStr, 10) - 1
                  const start = new Date(y, mIndex, 1)
                  const end = new Date(y, mIndex + 1, 1)

                  const filtered = orders.filter((o) => {
                    const d = new Date(o.order_date)
                    if (Number.isNaN(d.getTime())) return false
                    return d >= start && d < end
                  })

                  const qtyMap = new Map<string, { product_id: string; name: string; units: number }>()

                  filtered.forEach((order) => {
                    ;(order.order_items || []).forEach((item: any) => {
                      const productId = item.product_id
                      if (!productId) return

                      const qty = Number.parseFloat(item.quantity) || 0
                      if (qty <= 0) return

                      const existing = qtyMap.get(productId)
                      if (existing) {
                        existing.units += qty
                      } else {
                        const product = products.find((p) => p.id === productId)
                        qtyMap.set(productId, {
                          product_id: productId,
                          name: item.product_name || product?.name || "Produit",
                          units: qty,
                        })
                      }
                    })
                  })

                  const slices = Array.from(qtyMap.values()).sort((a, b) => b.units - a.units)

                  if (slices.length === 0) {
                    return <p className="text-muted-foreground text-center py-10">Aucune vente ce mois-ci</p>
                  }

                  const palette = [
                    "#3b82f6",
                    "#22c55e",
                    "#f97316",
                    "#a855f7",
                    "#06b6d4",
                    "#e11d48",
                    "#84cc16",
                    "#f59e0b",
                    "#6366f1",
                    "#14b8a6",
                    "#ef4444",
                    "#8b5cf6",
                    "#10b981",
                    "#fb7185",
                    "#60a5fa",
                    "#d946ef",
                  ]

                  const totalUnits = slices.reduce((sum, s) => sum + s.units, 0)

                  return (
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
                                data={slices.map((s, idx) => ({
                                  name: s.name,
                                  units: s.units,
                                  fill: palette[idx % palette.length],
                                }))}
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
                              />
                            </PieChart>
                          </div>
                        </ChartContainer>
                      </div>

                      <div className="md:col-span-2 space-y-4">
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">Best seller</p>
                          <p className="mt-1 text-lg font-bold">{slices[0]?.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {slices[0]?.units.toLocaleString("fr-FR")} unité(s)
                          </p>
                        </div>

                        <div className="rounded-lg border p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Répartition (unités)</p>
                            <p className="text-xs text-muted-foreground">(du mois sélectionné)</p>
                          </div>

                          <div className="mt-3 space-y-2">
                            {slices.map((s, idx) => (
                              <div key={s.product_id} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: palette[idx % palette.length] }}
                                  />
                                  <span className="text-sm truncate">{s.name}</span>
                                </div>
                                <div className="text-sm font-medium tabular-nums">
                                  {s.units.toLocaleString("fr-FR")} ({Math.round((s.units / totalUnits) * 100)}%)
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
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



      {/* Delete modal */}
      {deleteModal.isOpen && (
        <Dialog
          open={deleteModal.isOpen}
          onOpenChange={(open) => !open && setDeleteModal({ isOpen: false, orderId: "", reason: "" })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la Commande</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Raison de l'annulation (obligatoire)</Label>
                <Textarea
                  id="reason"
                  value={deleteModal.reason}
                  onChange={(e) => setDeleteModal({ ...deleteModal, reason: e.target.value })}
                  placeholder="Expliquez pourquoi vous annulez cette commande..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, orderId: "", reason: "" })}>
                  Annuler
                </Button>
                <Button variant="destructive" onClick={confirmArchive}>
                  Annuler la commande
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
