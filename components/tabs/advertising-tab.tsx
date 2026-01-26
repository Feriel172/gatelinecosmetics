"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Trash2, Plus, Edit2, ArchiveRestore } from "lucide-react"

export default function AdvertisingTab() {
  const [collaborations, setCollaborations] = useState([])
  const [todayCollaborations, setTodayCollaborations] = useState([])
  const [products, setProducts] = useState([])
  const [deliveryCities, setDeliveryCities] = useState([])
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [archiveView, setArchiveView] = useState(false)

  const [formData, setFormData] = useState({
    platform: "",
    influencer_username: "",
    influencer_email: "",
    influencer_phone: "",
    collaboration_description: "",
    collaboration_date: "",
    collaboration_type: "unpaid",
    collaboration_rate: "",
    shipping_city: "",
    shipping_address: "",
    comments: "",
  })

  const [deleteComment, setDeleteComment] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const supabase = getSupabaseClient()
  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    fetchData()
  }, [archiveView])

  const fetchData = async () => {
    try {
      // Fetch collaborations
      const { data: collabData } = await supabase
        .from("collaborations")
        .select("*")
        .eq("is_archived", archiveView)
        .order("collaboration_date", { ascending: false })

      setCollaborations(collabData || [])

      // Filter today's collaborations
      if (!archiveView) {
        const today_collabs = (collabData || []).filter((c) => c.collaboration_date === today && !c.is_archived)
        setTodayCollaborations(today_collabs)
      }

      // Fetch products (non-archived)
      const { data: productsData } = await supabase.from("products").select("*").eq("is_archived", false)

      setProducts(productsData || [])

      // Fetch delivery cities
      const { data: citiesData } = await supabase.from("delivery_cities").select("*")
      setDeliveryCities(citiesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const calculateTotalCost = (productsIds, city, rate) => {
    let total = 0

    // Add production cost of selected products
    productsIds.forEach((productId) => {
      const product = products.find((p) => p.id === productId)
      if (product) {
        total += product.production_cost
      }
    })

    // Add collaboration rate if paid
    if (rate) {
      total += Number.parseFloat(rate) || 0
    }

    // Add delivery cost based on city
    const selectedCity = deliveryCities.find((c) => c.zone_name === city)
    if (selectedCity) {
      total += selectedCity.delivery_cost
    }

    return total
  }

  const handleSaveCollaboration = async () => {
    if (
      !formData.platform ||
      !formData.influencer_username ||
      !formData.influencer_email ||
      !formData.collaboration_date ||
      !formData.collaboration_type ||
      selectedProducts.length === 0
    ) {
      alert("Veuillez remplir tous les champs requis")
      return
    }

    if (formData.collaboration_type === "paid" && !formData.collaboration_rate) {
      alert("Veuillez entrer le tarif pour une collaboration payante")
      return
    }

    const totalCost = calculateTotalCost(
      selectedProducts,
      formData.shipping_city,
      formData.collaboration_type === "paid" ? formData.collaboration_rate : 0,
    )

    const collabData = {
      ...formData,
      collaboration_rate:
        formData.collaboration_type === "paid" ? Number.parseFloat(formData.collaboration_rate) : null,
      products_sent: selectedProducts,
      total_cost: totalCost,
    }

    try {
      if (editingId) {
        await supabase.from("collaborations").update(collabData).eq("id", editingId)
      } else {
        await supabase.from("collaborations").insert([collabData])
      }

      setShowDialog(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error saving collaboration:", error)
      alert("Erreur lors de la sauvegarde")
    }
  }

  const handleEditCollaboration = (collaboration) => {
    setFormData({
      platform: collaboration.platform,
      influencer_username: collaboration.influencer_username,
      influencer_email: collaboration.influencer_email,
      influencer_phone: collaboration.influencer_phone,
      collaboration_description: collaboration.collaboration_description,
      collaboration_date: collaboration.collaboration_date,
      collaboration_type: collaboration.collaboration_type,
      collaboration_rate: collaboration.collaboration_rate || "",
      shipping_city: collaboration.shipping_city,
      shipping_address: collaboration.shipping_address,
      comments: collaboration.comments || "",
    })
    setSelectedProducts(collaboration.products_sent || [])
    setEditingId(collaboration.id)
    setShowDialog(true)
  }

  const handleDeleteCollaboration = async () => {
    if (!deleteComment.trim()) {
      alert("Veuillez entrer une raison pour archiver")
      return
    }

    try {
      await supabase
        .from("collaborations")
        .update({ is_archived: true, deletion_reason: deleteComment })
        .eq("id", deletingId)

      setShowDeleteDialog(false)
      setDeleteComment("")
      setDeletingId(null)
      fetchData()
    } catch (error) {
      console.error("Error archiving collaboration:", error)
      alert("Erreur lors de l'archivage")
    }
  }

  const handleRestoreCollaboration = async (id) => {
    try {
      await supabase.from("collaborations").update({ is_archived: false, deletion_reason: null }).eq("id", id)

      fetchData()
    } catch (error) {
      console.error("Error restoring collaboration:", error)
      alert("Erreur lors de la restauration")
    }
  }

  const resetForm = () => {
    setFormData({
      platform: "",
      influencer_username: "",
      influencer_email: "",
      influencer_phone: "",
      collaboration_description: "",
      collaboration_date: "",
      collaboration_type: "unpaid",
      collaboration_rate: "",
      shipping_city: "",
      shipping_address: "",
      comments: "",
    })
    setSelectedProducts([])
    setEditingId(null)
  }

  const toggleProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId))
    } else {
      setSelectedProducts([...selectedProducts, productId])
    }
  }

  return (
    <div className="space-y-6">
      {/* Toggle between active and archived */}
      <div className="flex gap-4">
        <Button variant={!archiveView ? "default" : "outline"} onClick={() => setArchiveView(false)}>
          Collaborations Actives
        </Button>
        <Button variant={archiveView ? "default" : "outline"} onClick={() => setArchiveView(true)}>
          Collaborations Archivées
        </Button>
      </div>

      {!archiveView && (
        <>
          {/* Today's Collaborations */}
          <Card className="border-2 border-primary/20 p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Collaborations du Jour</h3>
            {todayCollaborations.length > 0 ? (
              <div className="space-y-3">
                {todayCollaborations.map((collab) => (
                  <div
                    key={collab.id}
                    className="p-4 bg-white rounded-lg border border-primary/20 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-foreground">@{collab.influencer_username}</p>
                      <p className="text-sm text-muted-foreground">{collab.platform}</p>
                      <p className="text-sm font-semibold text-primary mt-1">
                        Coût total: {collab.total_cost.toLocaleString("fr-DZ")} DZD
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditCollaboration(collab)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setDeletingId(collab.id)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucune collaboration prévue aujourd'hui</p>
            )}
          </Card>

          {/* New Collaboration Button */}
          <Button
            onClick={() => {
              resetForm()
              setShowDialog(true)
            }}
            size="lg"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Collaboration
          </Button>
        </>
      )}

      {/* Collaborations List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">
          {archiveView ? "Collaborations Archivées" : "Toutes les Collaborations"}
        </h3>
        {collaborations.map((collab) => (
          <Card key={collab.id} className="p-4 bg-card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold text-foreground">@{collab.influencer_username}</p>
                <p className="text-sm text-muted-foreground">{collab.platform}</p>
                <p className="text-sm text-muted-foreground">{collab.collaboration_date}</p>
                <p className="text-sm mt-2 text-foreground">{collab.collaboration_description}</p>
                <p className="text-sm font-semibold text-primary mt-2">
                  Coût total: {collab.total_cost.toLocaleString("fr-DZ")} DZD
                </p>
              </div>
              <div className="flex gap-2">
                {!archiveView ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleEditCollaboration(collab)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeletingId(collab.id)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleRestoreCollaboration(collab.id)}>
                    <ArchiveRestore className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Collaboration Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-screen overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la Collaboration" : "Nouvelle Collaboration"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Plateforme *</label>
              <div className="space-y-2">
                {["Instagram", "TikTok", "Both"].map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="platform"
                      value={p}
                      checked={formData.platform === p}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Nom d'utilisateur Influenceur *
              </label>
              <Input
                placeholder="@username"
                value={formData.influencer_username}
                onChange={(e) => setFormData({ ...formData, influencer_username: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Email Influenceur *</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.influencer_email}
                onChange={(e) => setFormData({ ...formData, influencer_email: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Téléphone Influenceur</label>
              <Input
                type="tel"
                placeholder="+213..."
                value={formData.influencer_phone}
                onChange={(e) => setFormData({ ...formData, influencer_phone: e.target.value })}
              />
            </div>

            {/* Collaboration Description */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Planifié pour *</label>
              <Textarea
                placeholder="Description de la collaboration"
                value={formData.collaboration_description}
                onChange={(e) => setFormData({ ...formData, collaboration_description: e.target.value })}
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Commentaires</label>
              <Textarea
                placeholder="Ajouter des commentaires..."
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Date *</label>
              <Input
                type="date"
                value={formData.collaboration_date}
                onChange={(e) => setFormData({ ...formData, collaboration_date: e.target.value })}
              />
            </div>

            {/* Collaboration Type */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Type de Collaboration *</label>
              <div className="space-y-2">
                {["unpaid", "paid"].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="collaboration_type"
                      value={type}
                      checked={formData.collaboration_type === type}
                      onChange={(e) => setFormData({ ...formData, collaboration_type: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {type === "unpaid" ? "Collaboration Non Payante" : "Collaboration Payante"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Collaboration Rate (if paid) */}
            {formData.collaboration_type === "paid" && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Tarif *</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.collaboration_rate}
                  onChange={(e) => setFormData({ ...formData, collaboration_rate: e.target.value })}
                />
              </div>
            )}

            {/* Products Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Produits Envoyés *</label>
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30 max-h-48 overflow-y-auto">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {product.name} - Coût: {product.production_cost.toLocaleString("fr-DZ")} DZD
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Shipping City */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Ville de Livraison</label>
              <Select
                value={formData.shipping_city}
                onValueChange={(value) => setFormData({ ...formData, shipping_city: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une ville" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryCities.map((city) => (
                    <SelectItem key={city.id} value={city.city_name}>
                      {city.city_name} - {city.delivery_cost.toLocaleString("fr-DZ")} DZD
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shipping Address */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Adresse de Livraison</label>
              <Textarea
                placeholder="Adresse complète"
                value={formData.shipping_address}
                onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
              />
            </div>

            {/* Total Cost Display */}
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">Coût Total de la Collaboration</p>
              <p className="text-2xl font-bold text-primary">
                {calculateTotalCost(
                  selectedProducts,
                  formData.shipping_city,
                  formData.collaboration_type === "paid" ? formData.collaboration_rate : 0,
                ).toLocaleString("fr-DZ")}{" "}
                DZD
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveCollaboration} className="flex-1">
                {editingId ? "Modifier" : "Créer"} Collaboration
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete/Archive Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver la Collaboration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Veuillez entrer une raison pour archiver cette collaboration
            </p>
            <Textarea
              placeholder="Raison de l'archivage..."
              value={deleteComment}
              onChange={(e) => setDeleteComment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleDeleteCollaboration} className="flex-1" variant="destructive">
                Archiver
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
