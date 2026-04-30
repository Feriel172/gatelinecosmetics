"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Edit2, Search } from "lucide-react"

interface Product {
  id: string
  name: string
}

interface RawMaterial {
  id: string
  name: string
  description?: string
}

interface ProductRawMaterial {
  id: string
  product_id: string
  raw_material_id: string
  quantity: number
  status: string
}

// Extended type with joined data - grouped by raw material
interface StockItem {
  id: string
  rawMaterialId: string
  rawMaterialName: string
  quantity: number
  status: "in_stock" | "low_stock" | "out_of_stock"
  products: string[] // List of products using this raw material
}

export default function StockTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [formData, setFormData] = useState({
    product_id: "",
    raw_material_id: "",
    quantity: "0",
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      const [productsRes, rawMaterialsRes, stockRes] = await Promise.all([
        supabase.from("products").select("id, name").order("name"),
        supabase.from("raw_materials").select("id, name, description").order("name"),
        supabase.from("product_raw_materials").select("id, product_id, raw_material_id, quantity, status"),
      ])

      setProducts(productsRes.data || [])
      setRawMaterials(rawMaterialsRes.data || [])

// Group by raw material - each raw material shows once with all its products
      const groupedStockData = new Map<string, StockItem>()
      
      ;(stockRes.data || []).forEach((item: any) => {
        const rawMaterial = (rawMaterialsRes.data || []).find((rm: any) => rm.id === item.raw_material_id)
        const product = (productsRes.data || []).find((p: any) => p.id === item.product_id)
        
        if (!rawMaterial) return

        const rawMaterialId = item.raw_material_id
        const rawMaterialName = rawMaterial.name

        if (groupedStockData.has(rawMaterialId)) {
          // Add to existing entry - sum quantity and add product
          const existing = groupedStockData.get(rawMaterialId)!
          existing.quantity += item.quantity || 0
          if (product?.name && !existing.products.includes(product.name)) {
            existing.products.push(product.name)
          }
        } else {
          // Create new entry
          const quantity = item.quantity || 0
          let calculatedStatus: "in_stock" | "low_stock" | "out_of_stock"
          if (quantity < 20) {
            calculatedStatus = "out_of_stock"
          } else if (quantity <= 50) {
            calculatedStatus = "low_stock"
          } else {
            calculatedStatus = "in_stock"
          }

          groupedStockData.set(rawMaterialId, {
            id: rawMaterialId,
            rawMaterialId,
            rawMaterialName,
            quantity,
            status: calculatedStatus,
            products: product?.name ? [product.name] : [],
          })
        }
      })

const stockData: StockItem[] = Array.from(groupedStockData.values())

      // Sort raw materials in order: Toner pads > Contour des yeux > Masque > Étiquette > others
      const sortOrder: Record<string, number> = {
        'Toner pads': 1,
        'Contour des yeux': 2,
        'Masque': 3,
        'Étiquette': 4,
      }
      
      stockData.sort((a, b) => {
        const orderA = sortOrder[a.rawMaterialName] || 999
        const orderB = sortOrder[b.rawMaterialName] || 999
        if (orderA !== orderB) return orderA - orderB
        return a.rawMaterialName.localeCompare(b.rawMaterialName)
      })

      setStockItems(stockData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800 border-green-300"
      case "low_stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "out_of_stock":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_stock":
        return "En Stock"
      case "low_stock":
        return "Stock Faible"
      case "out_of_stock":
        return "Rupture"
      default:
        return status
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.product_id || !formData.raw_material_id) {
      alert("Veuillez sélectionner un produit et une matière première")
      return
    }

    try {
const quantity = parseFloat(formData.quantity) || 0
      let status: string

      if (quantity < 20) {
        status = "out_of_stock"
      } else if (quantity <= 50) {
        status = "low_stock"
      } else {
        status = "in_stock"
      }

if (editingItem) {
        // Update all records for this raw material
        const { data: existingRecords, error: fetchError } = await supabase
          .from("product_raw_materials")
          .select("id")
          .eq("raw_material_id", editingItem.rawMaterialId)

        if (fetchError) throw fetchError

        // Update all records
        for (const record of existingRecords || []) {
          const { error: updateError } = await supabase
            .from("product_raw_materials")
            .update({ quantity: quantity, status: status })
            .eq("id", record.id)

          if (updateError) throw updateError
        }
      } else {
        // Check if combination exists - find by raw_material_id
        const existing = stockItems.find(
          (item) => item.rawMaterialId === formData.raw_material_id
        )

        if (existing) {
          // Update all records for this raw material with same quantity
          const { data: existingRecords, error: fetchError } = await supabase
            .from("product_raw_materials")
            .select("id")
            .eq("raw_material_id", formData.raw_material_id)

          if (fetchError) throw fetchError

          // Update all records
          for (const record of existingRecords || []) {
            const { error: updateError } = await supabase
              .from("product_raw_materials")
              .update({ quantity: quantity, status: status })
              .eq("id", record.id)

            if (updateError) throw updateError
          }
        } else {
          // Insert new
          const { error } = await supabase.from("product_raw_materials").insert({
            product_id: formData.product_id,
            raw_material_id: formData.raw_material_id,
            quantity: quantity,
            status: status,
          })

          if (error) throw error
        }
      }

      setFormData({ product_id: "", raw_material_id: "", quantity: "0" })
      setEditingItem(null)
      setIsDialogOpen(false)
      await fetchData()
    } catch (error) {
      console.error("Error saving stock:", error)
      alert("Impossible d'enregistrer le stock. Veuillez réessayer.")
    }
  }

const handleEdit = (item: StockItem) => {
    // For editing, we need to select first product from the list
    setEditingItem(item)
    setFormData({
      product_id: item.products[0] ? products.find(p => p.name === item.products[0])?.id || "" : "",
      raw_material_id: item.rawMaterialId,
      quantity: item.quantity.toString(),
    })
    setIsDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingItem(null)
    setFormData({ product_id: "", raw_material_id: "", quantity: "0" })
    setIsDialogOpen(true)
  }

// Filter stock items
  const filteredItems = stockItems.filter((item) => {
    const matchesSearch = item.rawMaterialName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProduct = productFilter === "all" || item.products.includes(
      products.find(p => p.id === productFilter)?.name || ""
    )
    return matchesSearch && matchesProduct
  })

  // Calculate summary
  const inStockCount = stockItems.filter((item) => item.status === "in_stock").length
  const lowStockCount = stockItems.filter((item) => item.status === "low_stock").length
  const outOfStockCount = stockItems.filter((item) => item.status === "out_of_stock").length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Gestion du Stock</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{inStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Faible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rupture de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="search">Rechercher</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Rechercher une matière première..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="min-w-[200px]">
          <Label htmlFor="product-filter">Filtrer par Produit</Label>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger id="product-filter" className="mt-1">
              <SelectValue placeholder="Tous les produits" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les produits</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifier le Stock" : "Ajouter du Stock"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="product_id">Produit *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    disabled={!!editingItem}
                  >
                    <SelectTrigger id="product_id" className="mt-1">
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
                <div>
                  <Label htmlFor="raw_material_id">Matière Première *</Label>
                  <Select
                    value={formData.raw_material_id}
                    onValueChange={(value) => setFormData({ ...formData, raw_material_id: value })}
                    disabled={!!editingItem}
                  >
                    <SelectTrigger id="raw_material_id" className="mt-1">
                      <SelectValue placeholder="Sélectionner une matière première" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantité</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="mt-1"
                  />
<p className="text-xs text-muted-foreground mt-1">
                    Stock 51+ = En Stock, 20-50 = Stock Faible, below 20 = Rupture
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">{editingItem ? "Modifier" : "Ajouter"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stock Table */}
      {isLoading ? (
        <p className="text-muted-foreground">Chargement du stock...</p>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun élément de stock trouvé. Commencez par ajouter du stock.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
<thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border">Matière Première</th>
                <th className="text-left p-3 border">Produits</th>
                <th className="text-right p-3 border">Quantité</th>
                <th className="text-center p-3 border">Statut</th>
                <th className="text-center p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50">
                  <td className="p-3 border font-medium">{item.rawMaterialName}</td>
                  <td className="p-3 border">{item.products.join(", ")}</td>
                  <td className="p-3 border text-right font-semibold">{item.quantity}</td>
                  <td className="p-3 border text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="p-3 border text-center">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredItems.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Légende des statuts:</strong>
            </p>
<ul className="text-xs text-muted-foreground mt-1 space-y-1">
              <li>
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                En Stock: Quantité 51+
              </li>
              <li>
                <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                Stock Faible: Quantité 20-50
              </li>
              <li>
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Rupture de Stock: Below 20
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
