"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Search, Archive, RotateCcw, Edit } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Product {
  id: string
  name: string
  price_details: string
  production_cost: number
  selling_price: number
  is_archived: boolean
  deletion_reason?: string
  flacon?: boolean
  masque?: boolean
  etiquette?: boolean
}

interface IngredientRow {
  name: string
  quantity: string
  unit: string
}

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: string; reason: string }>({
    isOpen: false,
    productId: "",
    reason: "",
  })
const [formData, setFormData] = useState({
    name: "",
    price_details: "",
    production_cost: "",
    selling_price: "",
    flacon: false,
    masque: false,
    etiquette: false,
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const filtered = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
      setFilteredProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setIsLoading(false)
    }
  }



  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
if (editingId) {
        const { error } = await supabase
          .from("products")
          .update({
            name: formData.name,
            price_details: formData.price_details,
            production_cost: Number.parseFloat(formData.production_cost) || 0,
            selling_price: Number.parseFloat(formData.selling_price) || 0,
            flacon: formData.flacon,
            masque: formData.masque,
            etiquette: formData.etiquette,
          })
          .eq("id", editingId)

        if (error) throw error
      } else {
        const { error } = await supabase.from("products").insert({
          name: formData.name,
          price_details: formData.price_details,
          production_cost: Number.parseFloat(formData.production_cost) || 0,
          selling_price: Number.parseFloat(formData.selling_price) || 0,
          flacon: formData.flacon,
          masque: formData.masque,
          etiquette: formData.etiquette,
        })

        if (error) throw error
      }

setFormData({ name: "", price_details: "", production_cost: "", selling_price: "", flacon: false, masque: false, etiquette: false })
      setEditingId(null)
      setIsOpen(false)

      await fetchProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Impossible d'enregistrer le produit. Veuillez réessayer.")
    }
  }

const handleEditProduct = (product: Product) => {
    setFormData({
      name: product.name,
      price_details: product.price_details || "",
      production_cost: product.production_cost.toString(),
      selling_price: product.selling_price.toString(),
      flacon: product.flacon || false,
      masque: product.masque || false,
      etiquette: product.etiquette || false,
    })
    setEditingId(product.id)
    setIsOpen(true)
  }

  const handleArchiveProduct = async (id: string) => {
    setDeleteModal({ isOpen: true, productId: id, reason: "" })
  }

  const confirmArchive = async () => {
    if (!deleteModal.reason.trim()) {
      alert("Veuillez fournir une raison pour l'archivage")
      return
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_archived: true, deletion_reason: deleteModal.reason })
        .eq("id", deleteModal.productId)

      if (error) throw error
      setDeleteModal({ isOpen: false, productId: "", reason: "" })
      await fetchProducts()
    } catch (error) {
      console.error("Error archiving product:", error)
    }
  }

  const handleRestoreProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_archived: false, deletion_reason: null })
        .eq("id", id)

      if (error) throw error
      await fetchProducts()
    } catch (error) {
      console.error("Error restoring product:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount)
  }

  const activeProducts = filteredProducts.filter((p) => !p.is_archived)
  const archivedProducts = filteredProducts.filter((p) => p.is_archived)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Gestion des Produits</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {editingId ? "Modifier" : "Nouveau Produit"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le Produit" : "Créer un Nouveau Produit"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Nom du Produit</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Sérum Vitamine C"
                  />
                </div>

                <div>
                  <Label htmlFor="price_details">Détails des Prix</Label>
                  <Textarea
                    id="price_details"
                    value={formData.price_details}
                    onChange={(e) => setFormData({ ...formData, price_details: e.target.value })}
                    placeholder="Entrez les détails des prix..."
                    rows={4}
                  />
                </div>

<div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="production_cost">Coût de Production (DZD)</Label>
                    <Input
                      id="production_cost"
                      type="number"
                      step="0.01"
                      value={formData.production_cost}
                      onChange={(e) => setFormData({ ...formData, production_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="selling_price">Prix de Vente (DZD)</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Packaging options */}
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-sm font-medium mb-3">Emballage requis</p>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.flacon}
                        onChange={(e) => setFormData({ ...formData, flacon: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Flacon</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.masque}
                        onChange={(e) => setFormData({ ...formData, masque: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Masque</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.etiquette}
                        onChange={(e) => setFormData({ ...formData, etiquette: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Étiquette</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false)
                    setEditingId(null)
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit">{editingId ? "Mettre à jour" : "Enregistrer"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Produits ({activeProducts.length})</TabsTrigger>
          <TabsTrigger value="archived">Archivés ({archivedProducts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Search field */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Chargement des produits...</p>
          ) : activeProducts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {products.filter((p) => !p.is_archived).length === 0
                  ? "Aucun produit encore. Créez votre premier produit pour commencer."
                  : "Aucun produit ne correspond à votre recherche."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Coût de Production</p>
                      <p className="font-semibold text-accent">{formatCurrency(product.production_cost)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Prix de Vente</p>
                      <p className="font-semibold text-primary">{formatCurrency(product.selling_price)}</p>
                    </div>
{product.price_details && (
                      <div className="text-sm border-t border-border pt-3">
                        <p className="text-muted-foreground mb-2">Détails des Prix</p>
                        <p className="text-sm">{product.price_details}</p>
                      </div>
                    )}

                    {/* Display packaging requirements */}
                    {(product.flacon || product.masque || product.etiquette) && (
                      <div className="text-sm border-t border-border pt-3">
                        <p className="text-muted-foreground mb-2">Emballage requis</p>
                        <div className="flex flex-wrap gap-2">
                          {product.flacon && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Flacon</span>
                          )}
                          {product.masque && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Masque</span>
                          )}
                          {product.etiquette && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Étiquette</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)} className="flex-1">
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveProduct(product.id)}
                        className="flex-1 text-destructive hover:text-destructive"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archiver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedProducts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">Aucun produit archivé</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow opacity-75">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm bg-destructive/10 p-2 rounded">
                      <p className="text-destructive text-xs font-semibold mb-1">Raison d'archivage:</p>
                      <p className="text-xs">{product.deletion_reason}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Coût de Production</p>
                      <p className="font-semibold text-accent">{formatCurrency(product.production_cost)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Prix de Vente</p>
                      <p className="font-semibold text-primary">{formatCurrency(product.selling_price)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreProduct(product.id)}
                      className="w-full mt-3"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurer
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete modal */}
      {deleteModal.isOpen && (
        <Dialog
          open={deleteModal.isOpen}
          onOpenChange={(open) => !open && setDeleteModal({ isOpen: false, productId: "", reason: "" })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archiver le Produit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Raison de l'archivage (obligatoire)</Label>
                <Textarea
                  id="reason"
                  value={deleteModal.reason}
                  onChange={(e) => setDeleteModal({ ...deleteModal, reason: e.target.value })}
                  placeholder="Expliquez pourquoi vous archivez ce produit..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, productId: "", reason: "" })}>
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
