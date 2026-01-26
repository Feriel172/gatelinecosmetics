"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  instagram_handle: string
  created_at: string
}

export default function CustomerSearchTab() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    instagram_handle: "",
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      customer.first_name.toLowerCase().includes(searchLower) ||
      customer.last_name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.phone_number.includes(searchTerm)
    )
  })

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from("customers").insert({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        instagram_handle: formData.instagram_handle || null,
      })

      if (error) throw error

      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        instagram_handle: "",
      })
      setIsOpen(false)
      await fetchCustomers()
    } catch (error) {
      console.error("Error saving customer:", error)
      alert("Impossible d'enregistrer le client")
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id)
      if (error) throw error
      await fetchCustomers()
    } catch (error) {
      console.error("Error deleting customer:", error)
    }
  }

  return (
    <div className="space-y-6">
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
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un Nouveau Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCustomer} className="space-y-4">
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                <div>
                  <Label htmlFor="instagram_handle">Compte Instagram (Optionnel)</Label>
                  <Input
                    id="instagram_handle"
                    placeholder="@utilisateur"
                    value={formData.instagram_handle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instagram_handle: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Ajouter</Button>
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
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="break-all">{customer.email}</p>
                  </div>
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
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCustomer(customer.id)}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
