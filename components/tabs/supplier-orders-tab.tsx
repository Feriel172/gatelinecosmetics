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
import { Plus, Search, Archive, RotateCcw, Edit } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Supplier {
  id: string
  name: string
}

interface SupplierOrder {
  id: string
  supplier_id: string
  order_date: string
  total_amount: number
  order_items: OrderItem[]
  comment?: string
  is_archived: boolean
  deletion_reason?: string
}

interface RawMaterial {
  id: string
  name: string
}

interface OrderItem {
  raw_material_id: string
  raw_material_name: string
  quantity: number
  price: number
  unit_of_measurement: string
}

export default function SupplierOrdersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<SupplierOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: string; reason: string }>({
    isOpen: false,
    orderId: "",
    reason: "",
  })
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_date: "",
    comment: "",
    total_amount: "",
    order_items: [] as OrderItem[],
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const filtered = orders.filter(
      (order) =>
        order.order_date.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredOrders(filtered)
  }, [searchTerm, orders])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [suppliersRes, rawMaterialsRes, ordersRes] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("raw_materials").select("*").order("name"),
        supabase.from("supplier_orders").select("*").order("order_date", { ascending: false }),
      ])

      setSuppliers(suppliersRes.data || [])
      setRawMaterials(rawMaterialsRes.data || [])
      setOrders(ordersRes.data || [])
      setFilteredOrders(ordersRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }



  const handleEditOrder = (order: SupplierOrder) => {
    setFormData({
      supplier_id: order.supplier_id,
      order_date: order.order_date,
      comment: order.comment || "",
      total_amount: order.total_amount.toString(),
      order_items: order.order_items || [],
    })
    setIsEditing(true)
    setEditingOrder(order)
    setIsOpen(true)
  }

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.supplier_id) {
      alert("Veuillez sélectionner un fournisseur")
      return
    }
    if (!formData.total_amount || Number.parseFloat(formData.total_amount) <= 0) {
      alert("Veuillez saisir un montant total valide")
      return
    }

    try {
      const total = Number.parseFloat(formData.total_amount)
      if (isEditing && editingOrder) {
        const { error } = await supabase
          .from("supplier_orders")
          .update({
            supplier_id: formData.supplier_id,
            order_date: formData.order_date,
            total_amount: total,
            comment: formData.comment || null,
            order_items: formData.order_items,
          })
          .eq("id", editingOrder.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("supplier_orders").insert({
          supplier_id: formData.supplier_id,
          order_date: formData.order_date || new Date().toISOString().split('T')[0],
          order_items: formData.order_items,
          total_amount: total,
          comment: formData.comment || null,
        })

        if (error) throw error
      }

      setFormData({ supplier_id: "", order_date: "", comment: "", total_amount: "", order_items: [] })
      setIsEditing(false)
      setEditingOrder(null)
      setIsOpen(false)
      await fetchData()
    } catch (error) {
      console.error("Error saving order:", error)
      alert("Impossible d'enregistrer la commande")
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
        .from("supplier_orders")
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
        .from("supplier_orders")
        .update({ is_archived: false, deletion_reason: null })
        .eq("id", id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error restoring order:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount)
  }

  const activeOrders = filteredOrders.filter((o) => !o.is_archived)
  const archivedOrders = filteredOrders.filter((o) => o.is_archived)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Commandes Fournisseurs</h2>
        {suppliers.length > 0 && (
          <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
              setIsEditing(false)
              setEditingOrder(null)
              setFormData({ supplier_id: "", order_date: "", comment: "", total_amount: "", order_items: [] })
            }
            setIsOpen(open)
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle Commande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? "Modifier la Commande Fournisseur" : "Créer une Commande Fournisseur"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveOrder} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier">Sélectionner un Fournisseur</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un fournisseur..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="order_date">Date de Commande</Label>
                    <Input
                      id="order_date"
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="comment">Commentaire (optionnel)</Label>
                  <Textarea
                    id="comment"
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Ajouter un commentaire pour cette commande..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Articles de la Commande</Label>
                  <div className="space-y-3">
                    {(formData.order_items || []).map((item, index) => (
                      <div key={index} className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Label htmlFor={`raw-material-${index}`}>Matière Première</Label>
                          <Select
                            value={item.raw_material_id}
                            onValueChange={(value) => {
                              const selectedRawMaterial = rawMaterials.find(rm => rm.id === value)
                              const updatedItems = [...formData.order_items]
                              updatedItems[index] = {
                                ...updatedItems[index],
                                raw_material_id: value,
                                raw_material_name: selectedRawMaterial?.name || ""
                              }
                              setFormData({ ...formData, order_items: updatedItems })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une matière première..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rawMaterials.map((rawMaterial) => (
                                <SelectItem key={rawMaterial.id} value={rawMaterial.id}>
                                  {rawMaterial.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Label htmlFor={`quantity-${index}`}>Quantité</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updatedItems = [...formData.order_items]
                              updatedItems[index] = {
                                ...updatedItems[index],
                                quantity: parseInt(e.target.value) || 0
                              }
                              setFormData({ ...formData, order_items: updatedItems })
                            }}
                          />
                        </div>
                        <div className="w-32">
                          <Label htmlFor={`unit-${index}`}>Unité</Label>
                          <Input
                            id={`unit-${index}`}
                            value={item.unit_of_measurement}
                            onChange={(e) => {
                              const updatedItems = [...formData.order_items]
                              updatedItems[index] = {
                                ...updatedItems[index],
                                unit_of_measurement: e.target.value
                              }
                              setFormData({ ...formData, order_items: updatedItems })
                            }}
                            placeholder="ex: pièces, kg..."
                          />
                        </div>
                        <div className="w-32">
                          <Label htmlFor={`price-${index}`}>Prix</Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => {
                              const updatedItems = [...formData.order_items]
                              updatedItems[index] = {
                                ...updatedItems[index],
                                price: parseFloat(e.target.value) || 0
                              }
                              setFormData({ ...formData, order_items: updatedItems })
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedItems = formData.order_items.filter((_, i) => i !== index)
                            setFormData({ ...formData, order_items: updatedItems })
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          order_items: [
                            ...formData.order_items,
                            {
                              raw_material_id: "",
                              raw_material_name: "",
                              quantity: 1,
                              price: 0,
                              unit_of_measurement: ""
                            }
                          ]
                        })
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un Article
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="total_amount">Montant Total</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    placeholder="Entrez le montant total..."
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">{isEditing ? "Modifier" : "Confirmer"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Commandes ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="archived">Annulées ({archivedOrders.length})</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {suppliers.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Aucun fournisseur ajouté. Veuillez d'abord ajouter des fournisseurs.</p>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <p className="text-muted-foreground">Chargement des commandes...</p>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {orders.filter((o) => !o.is_archived).length === 0
                  ? "Aucune commande encore. Créez votre première commande fournisseur."
                  : "Aucune commande ne correspond à votre recherche."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Commande - {new Date(order.order_date).toLocaleDateString("fr-FR")}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                        >
                          <Edit className="h-4 w-4" />
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
                    {order.comment && (
                      <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
                        <p className="font-semibold text-blue-900 mb-1">Commentaire:</p>
                        <p className="text-blue-800 text-xs">{order.comment}</p>
                      </div>
                    )}
                    <div className="border-t border-border pt-3">
                      <p className="text-muted-foreground text-sm">Montant Total</p>
                      <p className="text-xl font-bold text-accent">{formatCurrency(order.total_amount)}</p>
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
              <CardContent className="pt-6 text-center text-muted-foreground">Aucune commande archivée</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archivedOrders.map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Commande - {new Date(order.order_date).toLocaleDateString("fr-FR")}
                        </CardTitle>
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
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <p className="font-semibold mb-2">Articles:</p>
                        <ul className="space-y-1 text-xs">
                          {order.order_items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.raw_material_name}: {item.quantity} {item.unit_of_measurement} -{" "}
                              {formatCurrency(Number.parseFloat(item.price))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="border-t border-border pt-3">
                      <p className="text-muted-foreground text-sm">Montant Total</p>
                      <p className="text-xl font-bold text-accent">{formatCurrency(order.total_amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dépenses par Mois</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const monthlyStats = activeOrders.reduce((acc, order) => {
                  const date = new Date(order.order_date)
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                  const monthName = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
                  if (!acc[monthKey]) {
                    acc[monthKey] = { month: monthName, total: 0 }
                  }
                  acc[monthKey].total += order.total_amount
                  return acc
                }, {} as Record<string, { month: string; total: number }>)

                const sortedStats = Object.values(monthlyStats).sort((a, b) => {
                  const aDate = new Date(a.month + ' 1')
                  const bDate = new Date(b.month + ' 1')
                  return bDate.getTime() - aDate.getTime()
                })

                return sortedStats.length > 0 ? (
                  <div className="space-y-3">
                    {sortedStats.map((stat, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="font-medium">{stat.month}</span>
                        <span className="text-lg font-bold text-accent">{formatCurrency(stat.total)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center">Aucune donnée disponible</p>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
