"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Supplier {
  id: string
  name: string
  contact_email?: string
  contact_phone?: string
  address?: string
  created_at: string
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  instagram_handle: string
  created_at: string
  orderStats?: {
    total: number
    validated: number
    canceled: number
  }
}

interface RawMaterial {
  id: string
  name: string
  description?: string
  created_at: string
  associatedProducts?: Product[]
}

interface Professionnel {
  id: string
  name: string
  address: string
  city: string
  phone: string
  type: 'cosmetics' | 'pharmacies'
  created_at: string
}

interface Product {
  id: string
  name: string
  recipe?: string
  created_at: string
}

export default function SettingsTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [professionnels, setProfessionnels] = useState<Professionnel[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchTermProfessionnels, setSearchTermProfessionnels] = useState("")
  const [typeFilter, setTypeFilter] = useState<'all' | 'cosmetics' | 'pharmacies'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false)
  const [isCustomersOpen, setIsCustomersOpen] = useState(false)
  const [isProfessionnelsOpen, setIsProfessionnelsOpen] = useState(false)
  const [isProductsOpen, setIsProductsOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingProfessionnel, setEditingProfessionnel] = useState<Professionnel | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
  })
  const [customerForm, setCustomerForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    instagram_handle: "",
  })
  const [professionnelForm, setProfessionnelForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    type: "cosmetics" as 'cosmetics' | 'pharmacies',
  })
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    selectedProducts: [] as string[],
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [suppliersRes, customersRes, professionnelsRes, productsRes, rawMaterialsRes, productRawMaterialsRes, ordersRes] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("professionnels").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("name"),
        supabase.from("raw_materials").select("*").order("name"),
        supabase.from("product_raw_materials").select("product_id, raw_material_id, products(id, name)"),
        supabase.from("customer_orders").select("customer_id, status, is_archived"),
      ])

      setSuppliers(suppliersRes.data || [])
      setProfessionnels(professionnelsRes.data || [])
      setProducts(productsRes.data || [])

      // Process raw materials with associated products
      const rawMaterialsWithProducts = (rawMaterialsRes.data || []).map((rawMaterial: any) => {
        const associatedProducts = (productRawMaterialsRes.data || [])
          .filter((prm: any) => prm.raw_material_id === rawMaterial.id)
          .map((prm: any) => prm.products)
        return {
          ...rawMaterial,
          associatedProducts,
        }
      })
      setRawMaterials(rawMaterialsWithProducts)

      // Process customers with order statistics
      const customersWithStats = (customersRes.data || []).map((customer: any) => {
        const customerOrders = (ordersRes.data || []).filter((order: any) => order.customer_id === customer.id)
        const total = customerOrders.length
        const validated = customerOrders.filter((order: any) => order.status === "confirmée").length
        const canceled = customerOrders.filter((order: any) => order.is_archived === true).length

        return {
          ...customer,
          orderStats: {
            total,
            validated,
            canceled,
          },
        }
      })

      setCustomers(customersWithStats)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supplierForm.name.trim()) {
      alert("Veuillez entrer le nom du fournisseur")
      return
    }

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update({
            name: supplierForm.name,
            contact_email: supplierForm.contact_email || null,
            contact_phone: supplierForm.contact_phone || null,
            address: supplierForm.address || null,
          })
          .eq("id", editingSupplier.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("suppliers").insert({
          name: supplierForm.name,
          contact_email: supplierForm.contact_email || null,
          contact_phone: supplierForm.contact_phone || null,
          address: supplierForm.address || null,
        })

        if (error) throw error
      }

      setSupplierForm({ name: "", contact_email: "", contact_phone: "", address: "" })
      setEditingSupplier(null)
      setIsSuppliersOpen(false)
      await fetchData()
    } catch (error) {
      console.error("Error saving supplier:", error)
      alert("Impossible d'enregistrer le fournisseur")
    }
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      contact_email: supplier.contact_email || "",
      contact_phone: supplier.contact_phone || "",
      address: supplier.address || "",
    })
    setIsSuppliersOpen(true)
  }

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) return

    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error deleting supplier:", error)
    }
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update({
            first_name: customerForm.first_name,
            last_name: customerForm.last_name,
            phone_number: customerForm.phone_number,
            instagram_handle: customerForm.instagram_handle || null,
          })
          .eq("id", editingCustomer.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("customers").insert({
          first_name: customerForm.first_name,
          last_name: customerForm.last_name,
          phone_number: customerForm.phone_number,
          instagram_handle: customerForm.instagram_handle || null,
        })

        if (error) throw error
      }

      setCustomerForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        instagram_handle: "",
      })
      setEditingCustomer(null)
      setIsCustomersOpen(false)
      await fetchData()
    } catch (error) {
      console.error("Error saving customer:", error)
      alert("Impossible d'enregistrer le client")
    }
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setCustomerForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone_number: customer.phone_number,
      instagram_handle: customer.instagram_handle || "",
    })
    setIsCustomersOpen(true)
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error deleting customer:", error)
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      customer.first_name.toLowerCase().includes(searchLower) ||
      customer.last_name.toLowerCase().includes(searchLower) ||
      customer.phone_number.includes(searchTerm)
    )
  })

  const filteredProfessionnels = professionnels.filter((professionnel) => {
    const searchLower = searchTermProfessionnels.toLowerCase()
    const matchesSearch =
      professionnel.name.toLowerCase().includes(searchLower) ||
      professionnel.city.toLowerCase().includes(searchLower) ||
      professionnel.phone.includes(searchTermProfessionnels)
    const matchesType = typeFilter === 'all' || professionnel.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleSaveProfessionnel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!professionnelForm.name.trim() || !professionnelForm.address.trim() || !professionnelForm.city.trim() || !professionnelForm.phone.trim()) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      if (editingProfessionnel) {
        const { error } = await supabase
          .from("professionnels")
          .update({
            name: professionnelForm.name,
            address: professionnelForm.address,
            city: professionnelForm.city,
            phone: professionnelForm.phone,
            type: professionnelForm.type,
          })
          .eq("id", editingProfessionnel.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("professionnels").insert({
          name: professionnelForm.name,
          address: professionnelForm.address,
          city: professionnelForm.city,
          phone: professionnelForm.phone,
          type: professionnelForm.type,
        })

        if (error) throw error
      }

      setProfessionnelForm({
        name: "",
        address: "",
        city: "",
        phone: "",
        type: "cosmetics",
      })
      setEditingProfessionnel(null)
      setIsProfessionnelsOpen(false)
      await fetchData()
    } catch (error) {
      console.error("Error saving professionnel:", error)
      alert("Impossible d'enregistrer le professionnel")
    }
  }

  const handleEditProfessionnel = (professionnel: Professionnel) => {
    setEditingProfessionnel(professionnel)
    setProfessionnelForm({
      name: professionnel.name,
      address: professionnel.address,
      city: professionnel.city,
      phone: professionnel.phone,
      type: professionnel.type,
    })
    setIsProfessionnelsOpen(true)
  }

  const handleDeleteProfessionnel = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce professionnel ?")) return

    try {
      const { error } = await supabase.from("professionnels").delete().eq("id", id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error deleting professionnel:", error)
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productForm.name.trim()) {
      alert("Veuillez entrer le nom de la matière première")
      return
    }

    try {
      let rawMaterialId: string

      if (editingProduct) {
        const { error } = await supabase
          .from("raw_materials")
          .update({
            name: productForm.name,
            description: productForm.description || null,
          })
          .eq("id", editingProduct.id)

        if (error) throw error
        rawMaterialId = editingProduct.id

        // Delete existing associations
        await supabase
          .from("product_raw_materials")
          .delete()
          .eq("raw_material_id", rawMaterialId)
      } else {
        const { data, error } = await supabase.from("raw_materials").insert({
          name: productForm.name,
          description: productForm.description || null,
        } as any).select().single()

        if (error) throw error
        rawMaterialId = data.id
      }

      // Insert new associations
      if (productForm.selectedProducts.length > 0) {
        const associations = productForm.selectedProducts.map(productId => ({
          product_id: productId,
          raw_material_id: rawMaterialId,
        }))

        const { error: assocError } = await supabase
          .from("product_raw_materials")
          .insert(associations)

        if (assocError) throw assocError
      }

      setProductForm({ name: "", description: "", selectedProducts: [] })
      setEditingProduct(null)
      setIsProductsOpen(false)
      await fetchData()
    } catch (error) {
      console.error("Error saving raw material:", error)
      alert("Impossible d'enregistrer la matière première")
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || "",
    })
    setIsProductsOpen(true)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error deleting product:", error)
    }
  }

  const handleEditRawMaterial = (rawMaterial: RawMaterial) => {
    setEditingProduct(rawMaterial)
    setProductForm({
      name: rawMaterial.name,
      description: rawMaterial.description || "",
      selectedProducts: rawMaterial.associatedProducts?.map(p => p.id) || [],
    })
    setIsProductsOpen(true)
  }

  const handleDeleteRawMaterial = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette matière première ?")) return

    try {
      const { error } = await supabase.from("raw_materials").delete().eq("id", id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error deleting raw material:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Paramètres</h2>
      </div>

      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suppliers">Fournisseurs ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="customers">Clients ({customers.length})</TabsTrigger>
          <TabsTrigger value="professionnels">Professionnels ({professionnels.length})</TabsTrigger>
          <TabsTrigger value="stock">Stock ({rawMaterials.length})</TabsTrigger>
        </TabsList>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gestion des Fournisseurs</h3>
            <Dialog
              open={isSuppliersOpen}
              onOpenChange={(open) => {
                setIsSuppliersOpen(open)
                if (!open) {
                  setEditingSupplier(null)
                  setSupplierForm({ name: "", contact_email: "", contact_phone: "", address: "" })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter Fournisseur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier ? "Modifier Fournisseur" : "Ajouter un Nouveau Fournisseur"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveSupplier} className="space-y-4">
                  <div>
                    <Label htmlFor="supplier_name">Nom du Fournisseur *</Label>
                    <Input
                      id="supplier_name"
                      value={supplierForm.name}
                      onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_address">Adresse Complète (Optionnel)</Label>
                    <Input
                      id="supplier_address"
                      value={supplierForm.address}
                      onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                      placeholder="Rue, ville, code postal..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_email">Email (Optionnel)</Label>
                    <Input
                      id="supplier_email"
                      type="email"
                      value={supplierForm.contact_email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, contact_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_phone">Téléphone (Optionnel)</Label>
                    <Input
                      id="supplier_phone"
                      value={supplierForm.contact_phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, contact_phone: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsSuppliersOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">{editingSupplier ? "Modifier" : "Ajouter"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Chargement des fournisseurs...</p>
          ) : suppliers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucun fournisseur enregistré. Commencez par ajouter un fournisseur.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {suppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      {supplier.address && (
                        <div>
                          <p className="text-muted-foreground text-xs">Adresse</p>
                          <p>{supplier.address}</p>
                        </div>
                      )}
                      {supplier.contact_email && (
                        <div>
                          <p className="text-muted-foreground text-xs">Email</p>
                          <p className="break-all">{supplier.contact_email}</p>
                        </div>
                      )}
                      {supplier.contact_phone && (
                        <div>
                          <p className="text-muted-foreground text-xs">Téléphone</p>
                          <p>{supplier.contact_phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Ajouté le</p>
                        <p>{new Date(supplier.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSupplier(supplier)}
                        className="flex-1"
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Rechercher Clients</Label>
                <Input
                  id="search"
                  placeholder="Rechercher par nom, email ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="pt-6">
                <Dialog
                  open={isCustomersOpen}
                  onOpenChange={(open) => {
                    setIsCustomersOpen(open)
                    if (!open) {
                      setEditingCustomer(null)
                      setCustomerForm({
                        first_name: "",
                        last_name: "",
                        phone_number: "",
                        instagram_handle: "",
                      })
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCustomer ? "Modifier Client" : "Ajouter un Nouveau Client"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveCustomer} className="space-y-4">
                      <div>
                        <Label htmlFor="first_name">Prénom</Label>
                        <Input
                          id="first_name"
                          value={customerForm.first_name}
                          onChange={(e) => setCustomerForm({ ...customerForm, first_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Nom</Label>
                        <Input
                          id="last_name"
                          value={customerForm.last_name}
                          onChange={(e) => setCustomerForm({ ...customerForm, last_name: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone_number">Téléphone</Label>
                        <Input
                          id="phone_number"
                          value={customerForm.phone_number}
                          onChange={(e) => setCustomerForm({ ...customerForm, phone_number: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="instagram_handle">Compte Instagram (Optionnel)</Label>
                        <Input
                          id="instagram_handle"
                          placeholder="@utilisateur"
                          value={customerForm.instagram_handle}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              instagram_handle: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button type="button" variant="outline" onClick={() => setIsCustomersOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit">{editingCustomer ? "Modifier" : "Ajouter"}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Chargement des clients...</p>
            ) : filteredCustomers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {customers.length === 0
                    ? "Aucun client encore. Ajoutez votre premier client."
                    : "Aucun client ne correspond à votre recherche."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {customer.first_name} {customer.last_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-2">
                        <div>
                          <p className="text-muted-foreground text-xs">Téléphone</p>
                          <p>{customer.phone_number}</p>
                        </div>
                        {customer.instagram_handle && (
                          <div>
                            <p className="text-muted-foreground text-xs">Instagram</p>
                            <p>{customer.instagram_handle}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground text-xs">Membre Depuis</p>
                          <p>{new Date(customer.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                        {customer.orderStats && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground text-xs mb-2">Statistiques des Commandes</p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-blue-50 p-2 rounded">
                                <p className="text-lg font-bold text-blue-600">{customer.orderStats.total}</p>
                                <p className="text-xs text-blue-600">Total</p>
                              </div>
                              <div className="bg-green-50 p-2 rounded">
                                <p className="text-lg font-bold text-green-600">{customer.orderStats.validated}</p>
                                <p className="text-xs text-green-600">Validées</p>
                              </div>
                              <div className="bg-orange-50 p-2 rounded">
                                <p className="text-lg font-bold text-orange-600">{customer.orderStats.canceled}</p>
                                <p className="text-xs text-orange-600">Annulées</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                          className="flex-1"
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Professionnels Tab */}
        <TabsContent value="professionnels" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="search_professionnels">Rechercher Professionnels</Label>
                <Input
                  id="search_professionnels"
                  placeholder="Rechercher par nom, ville ou téléphone..."
                  value={searchTermProfessionnels}
                  onChange={(e) => setSearchTermProfessionnels(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="type_filter">Filtrer par type</Label>
                <select
                  id="type_filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'cosmetics' | 'pharmacies')}
                  className="px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="all">Tous</option>
                  <option value="cosmetics">Cosmétiques</option>
                  <option value="pharmacies">Pharmacies</option>
                </select>
              </div>
              <div className="pt-6">
                <Dialog
                  open={isProfessionnelsOpen}
                  onOpenChange={(open) => {
                    setIsProfessionnelsOpen(open)
                    if (!open) {
                      setEditingProfessionnel(null)
                      setProfessionnelForm({
                        name: "",
                        address: "",
                        city: "",
                        phone: "",
                        type: "cosmetics",
                      })
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter Professionnel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingProfessionnel ? "Modifier Professionnel" : "Ajouter un Nouveau Professionnel"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveProfessionnel} className="space-y-4">
                      <div>
                        <Label htmlFor="professionnel_name">Nom *</Label>
                        <Input
                          id="professionnel_name"
                          value={professionnelForm.name}
                          onChange={(e) => setProfessionnelForm({ ...professionnelForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="professionnel_address">Adresse *</Label>
                        <Input
                          id="professionnel_address"
                          value={professionnelForm.address}
                          onChange={(e) => setProfessionnelForm({ ...professionnelForm, address: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="professionnel_city">Ville *</Label>
                        <Input
                          id="professionnel_city"
                          value={professionnelForm.city}
                          onChange={(e) => setProfessionnelForm({ ...professionnelForm, city: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="professionnel_phone">Téléphone *</Label>
                        <Input
                          id="professionnel_phone"
                          value={professionnelForm.phone}
                          onChange={(e) => setProfessionnelForm({ ...professionnelForm, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="professionnel_type">Type *</Label>
                        <select
                          id="professionnel_type"
                          value={professionnelForm.type}
                          onChange={(e) => setProfessionnelForm({ ...professionnelForm, type: e.target.value as 'cosmetics' | 'pharmacies' })}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md"
                          required
                        >
                          <option value="cosmetics">Cosmétiques</option>
                          <option value="pharmacies">Pharmacies</option>
                        </select>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button type="button" variant="outline" onClick={() => setIsProfessionnelsOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit">{editingProfessionnel ? "Modifier" : "Ajouter"}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Chargement des professionnels...</p>
            ) : filteredProfessionnels.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {professionnels.length === 0
                    ? "Aucun professionnel enregistré. Commencez par ajouter un professionnel."
                    : "Aucun professionnel ne correspond à votre recherche."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProfessionnels.map((professionnel) => (
                  <Card key={professionnel.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{professionnel.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">{professionnel.type === 'cosmetics' ? 'Cosmétiques' : 'Pharmacies'}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-2">
                        <div>
                          <p className="text-muted-foreground text-xs">Adresse</p>
                          <p>{professionnel.address}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Ville</p>
                          <p>{professionnel.city}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Téléphone</p>
                          <p>{professionnel.phone}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Ajouté le</p>
                          <p>{new Date(professionnel.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProfessionnel(professionnel)}
                          className="flex-1"
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProfessionnel(professionnel.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gestion du Stock</h3>
            <Dialog
              open={isProductsOpen}
              onOpenChange={(open) => {
                setIsProductsOpen(open)
                if (!open) {
                  setEditingProduct(null)
                  setProductForm({ name: "", description: "", selectedProducts: [] })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter Matière Première
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Modifier Matière Première" : "Ajouter une Nouvelle Matière Première"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="product_name">Nom de la Matière Première *</Label>
                    <Input
                      id="product_name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="product_description">Description (Optionnel)</Label>
                    <Input
                      id="product_description"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Description de la matière première..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="product_associations">Produits associés (Optionnel)</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                      {products.map((product) => (
                        <label key={product.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={productForm.selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              const selected = productForm.selectedProducts
                              if (e.target.checked) {
                                setProductForm({
                                  ...productForm,
                                  selectedProducts: [...selected, product.id]
                                })
                              } else {
                                setProductForm({
                                  ...productForm,
                                  selectedProducts: selected.filter(id => id !== product.id)
                                })
                              }
                            }}
                          />
                          <span className="text-sm">{product.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sélectionnez les produits qui utilisent cette matière première
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsProductsOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">{editingProduct ? "Modifier" : "Ajouter"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Chargement des matières premières...</p>
          ) : rawMaterials.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune matière première enregistrée. Commencez par ajouter une matière première.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rawMaterials.map((rawMaterial) => (
                <Card key={rawMaterial.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{rawMaterial.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      {rawMaterial.description && (
                        <div>
                          <p className="text-muted-foreground text-xs">Description</p>
                          <p>{rawMaterial.description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Ajouté le</p>
                        <p>{new Date(rawMaterial.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRawMaterial(rawMaterial)}
                        className="flex-1"
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRawMaterial(rawMaterial.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
