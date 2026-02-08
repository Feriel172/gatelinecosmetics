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
import { Plus, Trash2, Copy, Search, Archive, RotateCcw, CheckCircle2, Edit } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  deletion_reason?: string
  status_comment?: string
}

export default function CustomerOrdersTab() {
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { product_id: "", product_name: "", quantity: "", price: 0 },
  ])
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; orderId: string; comment: string }>({
    isOpen: false,
    orderId: "",
    comment: "",
  })
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: string; reason: string }>({
    isOpen: false,
    orderId: "",
    reason: "",
  })
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    city: "",
    address: "",
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
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
        supabase.from("products").select("id, name, selling_price").order("name"),
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

  const generateOrderReference = () => {
    return `CMD-${Date.now().toString().slice(-9)}`
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

  const getDeliveryCost = () => {
    if (!formData.city) return 0
    const city = deliveryCities.find((c) => c.id === formData.city)
    return city?.delivery_cost || 0
  }

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.first_name || !formData.last_name || !formData.phone_number) {
      alert("Veuillez remplir toutes les informations du client")
      return
    }

    if (!formData.city || !formData.address) {
      alert("Veuillez sélectionner une ville et entrer une adresse")
      return
    }

    if (orderItems.some((item) => !item.product_id || !item.quantity)) {
      alert("Veuillez remplir tous les articles de la commande")
      return
    }

    try {
      let customerId = ""

      if (isEditing && editingOrder) {
        // When editing, use the existing customer_id and update customer info if changed
        customerId = editingOrder.customer_id
        const existingCustomer = customers.find((c) => c.id === customerId)
        if (existingCustomer) {
          // Update customer info if changed
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
        // When creating new order, find or create customer
        const existingCustomer = customers.find(
          (c) => c.phone_number === formData.phone_number && c.first_name === formData.first_name && c.last_name === formData.last_name,
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
        // Update existing order
        const { error } = await supabase
          .from("customer_orders")
          .update({
            customer_id: customerId,
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
        // Create new order
        const { error } = await supabase.from("customer_orders").insert({
          customer_id: customerId,
          order_reference: generateOrderReference(),
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
    if (newStatus === "confirmée") {
      setStatusModal({ isOpen: true, orderId, comment: "" })
    } else if (newStatus === "en attente") {
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

  const handleEditOrder = (order: CustomerOrder) => {
    const customer = customers.find((c) => c.id === order.customer_id)
    if (customer) {
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone_number: customer.phone_number,
        city: order.city || "",
        address: order.address || "",
      })
      setOrderItems(order.order_items || [{ product_id: "", product_name: "", quantity: "", price: 0 }])
      setEditingOrder(order)
      setIsEditing(true)
      setIsOpen(true)
    }
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

  const activeOrders = filteredOrders.filter((o) => !o.is_archived)
  const archivedOrders = filteredOrders.filter((o) => o.is_archived)
  const filteredArchivedOrders = archivedOrders.filter(
    (order) =>
      order.customer_name.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
      order.order_reference.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
      (order.deletion_reason && order.deletion_reason.toLowerCase().includes(archivedSearchTerm.toLowerCase()))
  )
  const pendingOrders = activeOrders.filter((o) => o.status === "en attente")

  const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0)
  const totalOrders = orders.length

  const getMonthlyStats = () => {
    const monthlyOrders: { [key: string]: { count: number; sales: number } } = {}
    orders.forEach(order => {
      const date = new Date(order.order_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyOrders[monthKey]) {
        monthlyOrders[monthKey] = { count: 0, sales: 0 }
      }
      monthlyOrders[monthKey].count += 1
      monthlyOrders[monthKey].sales += order.total_amount
    })
    return Object.entries(monthlyOrders).sort(([a], [b]) => b.localeCompare(a))
  }

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
                <div>
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
                  <p className="text-lg font-bold text-accent">
                    {formatCurrency(calculateSubtotal() + getDeliveryCost())}
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Commandes ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">En Attente ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="archived">Archivées ({archivedOrders.length})</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Search field */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Chargement des commandes...</p>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {orders.filter((o) => !o.is_archived).length === 0
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
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.order_date).toLocaleDateString("fr-FR")} • {order.address}, {order.city}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          Statut:{" "}
                          <span className={order.status === "confirmée" ? "text-green-600" : "text-orange-600"}>
                            {order.status}
                          </span>
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
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleChangeStatus(order.id, order.status === "en attente" ? "confirmée" : "en attente")
                          }
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {order.status === "en attente" ? "Confirmer" : "Annuler"}
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
                    {order.status_comment && (
                      <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
                        <p className="font-semibold text-blue-900 mb-1">Commentaire:</p>
                        <p className="text-blue-800 text-xs">{order.status_comment}</p>
                      </div>
                    )}
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
          {/* Search field for archived orders */}
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
                {orders.filter((o) => o.is_archived).length === 0
                  ? "Aucune commande archivée"
                  : "Aucune commande archivée ne correspond à votre recherche."}
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

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vue d'ensemble</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total des Commandes</span>
                  <span className="text-2xl font-bold">{totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ventes Totales</span>
                  <span className="text-2xl font-bold text-accent">{formatCurrency(totalSales)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Commandes par Mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getMonthlyStats().map(([month, stats]) => (
                    <div key={month} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <p className="font-medium">{new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</p>
                        <p className="text-sm text-muted-foreground">{stats.count} commande{stats.count > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-accent">{formatCurrency(stats.sales)}</p>
                      </div>
                    </div>
                  ))}
                  {getMonthlyStats().length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Aucune donnée disponible</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status modal */}
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

      {/* Delete modal */}
      {deleteModal.isOpen && (
        <Dialog
          open={deleteModal.isOpen}
          onOpenChange={(open) => !open && setDeleteModal({ isOpen: false, orderId: "", reason: "" })}
        >
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
