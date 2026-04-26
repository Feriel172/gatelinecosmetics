
"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Package } from "lucide-react"

interface RawMaterial {
  id: string
  name: string
  description?: string
}

interface Product {
  id: string
  name: string
}

interface ProductRawMaterial {
  product_id: string
  raw_material_id: string
}

interface SupplierOrder {
  id: string
  order_items: any[]
}

interface CustomerOrder {
  id: string
  order_items: any[]
}

interface Collaboration {
  id: string
  products_sent: string[]
}

interface StockData {
  rawMaterial: RawMaterial
  stockIn: number
  stockOut: number
  remaining: number
}

export default function StockTab() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productRawMaterials, setProductRawMaterials] = useState<ProductRawMaterial[]>([])
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([])
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [stockData, setStockData] = useState<StockData[]>([])

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all raw materials
      const [rawMaterialsRes, productsRes, productRawMaterialsRes, supplierOrdersRes, customerOrdersRes, collaborationsRes] = await Promise.all([
        supabase.from("raw_materials").select("*").order("name"),
        supabase.from("products").select("id, name").order("name"),
        supabase.from("product_raw_materials").select("product_id, raw_material_id"),
        supabase.from("supplier_orders").select("id, order_items").eq("is_archived", false),
        supabase.from("customer_orders").select("id, order_items").eq("is_archived", false),
        supabase.from("collaborations").select("id, products_sent").eq("is_archived", false),
      ])

      setRawMaterials(rawMaterialsRes.data || [])
      setProducts(productsRes.data || [])
      setProductRawMaterials(productRawMaterialsRes.data || [])
      setSupplierOrders(supplierOrdersRes.data || [])
      setCustomerOrders(customerOrdersRes.data || [])
      setCollaborations(collaborationsRes.data || [])

      // Calculate stock data
      calculateStock()
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStock = () => {
    const data: StockData[] = []

    // Create a map of product_id to raw_material_ids
    const productToRawMaterials = new Map<string, string[]>()
    productRawMaterials.forEach((prm) => {
      if (!productToRawMaterials.has(prm.product_id)) {
        productToRawMaterials.set(prm.product_id, [])
      }
      productToRawMaterials.get(prm.product_id)!.push(prm.raw_material_id)
    })

    // Create a map of raw_material_id to product_ids
    const rawMaterialToProducts = new Map<string, string[]>()
    productRawMaterials.forEach((prm) => {
      if (!rawMaterialToProducts.has(prm.raw_material_id)) {
        rawMaterialToProducts.set(prm.raw_material_id, [])
      }
      rawMaterialToProducts.get(prm.raw_material_id)!.push(prm.product_id)
    })

    // Calculate stock for each raw material
    rawMaterials.forEach((rawMaterial) => {
      let stockIn = 0
      let stockOut = 0

      // Calculate STOCK IN from supplier orders
      supplierOrders.forEach((order) => {
        if (order.order_items && Array.isArray(order.order_items)) {
          order.order_items.forEach((item: any) => {
            if (item.raw_material_id === rawMaterial.id) {
              stockIn += parseFloat(item.quantity) || 0
            }
          })
        }
      })

      // Get products that use this raw material
      const productsUsingThisRawMaterial = rawMaterialToProducts.get(rawMaterial.id) || []

      // Calculate STOCK OUT from customer orders
      customerOrders.forEach((order) => {
        if (order.order_items && Array.isArray(order.order_items)) {
          order.order_items.forEach((item: any) => {
            // Check if this order's product uses this raw material
            if (productsUsingThisRawMaterial.includes(item.product_id)) {
              const orderQuantity = parseFloat(item.quantity) || 0
              stockOut += orderQuantity
            }
          })
        }
      })

      // Calculate STOCK OUT from collaborations (influencer orders)
      collaborations.forEach((collab) => {
        if (collab.products_sent && Array.isArray(collab.products_sent)) {
          collab.products_sent.forEach((productId: string) => {
            // Each product sent counts as 1 unit
            if (productsUsingThisRawMaterial.includes(productId)) {
              stockOut += 1
            }
          })
        }
      })

      data.push({
        rawMaterial,
        stockIn,
        stockOut,
        remaining: stockIn - stockOut,
      })
    })

    setStockData(data)
  }

  const filteredStockData = stockData.filter((item) =>
    item.rawMaterial.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStockIn = stockData.reduce((sum, item) => sum + item.stockIn, 0)
  const totalStockOut = stockData.reduce((sum, item) => sum + item.stockOut, 0)
  const totalRemaining = stockData.reduce((sum, item) => sum + item.remaining, 0)

  // Add useEffect to recalculate when data changes
  useEffect(() => {
    if (rawMaterials.length > 0) {
      calculateStock()
    }
  }, [rawMaterials, productRawMaterials, supplierOrders, customerOrders, collaborations])

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Entrant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalStockIn.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sortant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{totalStockOut.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Restant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {totalRemaining.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une matière première..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stock Table */}
      {isLoading ? (
        <p className="text-muted-foreground">Chargement du stock...</p>
      ) : filteredStockData.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucune matière première trouvée
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border">Matière Première</th>
                <th className="text-right p-3 border">Entrant (Commandes Fournisseurs)</th>
                <th className="text-right p-3 border">Sortant (Commandes Clients)</th>
                <th className="text-right p-3 border">Sortant (Influenceurs)</th>
                <th className="text-right p-3 border">Stock Restant</th>
              </tr>
            </thead>
            <tbody>
              {filteredStockData.map((item) => (
                <tr key={item.rawMaterial.id} className="hover:bg-muted/50">
                  <td className="p-3 border font-medium">
                    {item.rawMaterial.name}
                    {item.rawMaterial.description && (
                      <p className="text-xs text-muted-foreground">{item.rawMaterial.description}</p>
                    )}
                  </td>
                  <td className="p-3 border text-right text-green-600 font-semibold">
                    {item.stockIn.toLocaleString()}
                  </td>
                  <td className="p-3 border text-right text-orange-600">
                    {item.stockOut > 0 ? `-${item.stockOut.toLocaleString()}` : '0'}
                  </td>
                  <td className="p-3 border text-right text-purple-600">
                    {/* We don't separately track influencer out, so showing 0 for now */}
                    0
                  </td>
                  <td className={`p-3 border text-right font-bold ${item.remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {item.remaining.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredStockData.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Calcul du stock:</strong> Stock Restant = Entrant (Commandes Fournisseurs) - Sortant (Commandes Clients + Influenceurs)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les quantités sortantes sont calculées en fonction des produits commandés et envoyés aux influenceurs qui utilisent cette matière première.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
