"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle } from "lucide-react"

interface PaymentAlert {
  id: string
  studentName: string
  subjectName: string
  levelName: string
  attendances: number
  amount: number
  studentId: string
  subjectLevelId: string
}

export default function PaymentAlerts() {
  const [alerts, setAlerts] = useState<PaymentAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      setIsLoading(true)

      // Get current month start and end
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Get all student enrollments with attendance counts
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("student_subject_levels")
        .select(`
          id,
          student_id,
          subject_level_id,
          students!inner(first_name, last_name),
          subject_levels!inner(subject_id, level_id, times_per_week, price_per_month, subjects(name), levels(name))
        `)
        .eq("active", true)

      if (enrollmentsError) throw enrollmentsError

      // Get attendance counts for current month
      const { data: attendances, error: attendancesError } = await supabase
        .from("student_attendance")
        .select("student_id, subject_level_id, attendance_date")
        .gte("attendance_date", startOfMonth.toISOString().split('T')[0])
        .lte("attendance_date", endOfMonth.toISOString().split('T')[0])
        .eq("present", true)

      if (attendancesError) throw attendancesError

      // Get existing payments for current month
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("student_id, subject_level_id, payment_date")
        .gte("payment_date", startOfMonth.toISOString().split('T')[0])
        .lte("payment_date", endOfMonth.toISOString().split('T')[0])

      if (paymentsError) throw paymentsError

      // Process alerts
      const alertsList: PaymentAlert[] = []

      enrollments?.forEach((enrollment: any) => {
        const student = enrollment.students
        const subjectLevel = enrollment.subject_levels
        const subject = subjectLevel.subjects
        const level = subjectLevel.levels

        // Count attendances for this enrollment
        const enrollmentAttendances = attendances?.filter(
          a => a.student_id === enrollment.student_id && a.subject_level_id === enrollment.subject_level_id
        ).length || 0

        // Check if already paid this month
        const alreadyPaid = payments?.some(
          p => p.student_id === enrollment.student_id && p.subject_level_id === enrollment.subject_level_id
        )

        // Calculate required attendances (times_per_week * 4 weeks)
        const requiredAttendances = subjectLevel.times_per_week * 4

        if (enrollmentAttendances >= requiredAttendances && !alreadyPaid) {
          alertsList.push({
            id: `${enrollment.student_id}-${enrollment.subject_level_id}`,
            studentName: `${student.first_name} ${student.last_name}`,
            subjectName: subject.name,
            levelName: level.name,
            attendances: enrollmentAttendances,
            amount: subjectLevel.price_per_month,
            studentId: enrollment.student_id,
            subjectLevelId: enrollment.subject_level_id,
          })
        }
      })

      setAlerts(alertsList)
    } catch (error) {
      console.error("Error fetching payment alerts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsPaid = async (alert: PaymentAlert) => {
    try {
      const { error } = await supabase
        .from("payments")
        .insert({
          student_id: alert.studentId,
          subject_level_id: alert.subjectLevelId,
          amount: alert.amount,
          payment_date: new Date().toISOString().split('T')[0],
        })

      if (error) throw error

      // Remove the alert from the list
      setAlerts(alerts.filter(a => a.id !== alert.id))
    } catch (error) {
      console.error("Error marking payment as paid:", error)
      alert("Erreur lors de l'enregistrement du paiement")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Chargement des alertes de paiement...</p>
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p>Aucune alerte de paiement pour le moment</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        Alertes de Paiement ({alerts.length})
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-orange-800">
                {alert.studentName}
              </CardTitle>
              <p className="text-sm text-orange-600">
                {alert.subjectName} - {alert.levelName}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div>
                  <p className="text-muted-foreground text-xs">Présences ce mois</p>
                  <p className="font-medium">{alert.attendances} séances</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Montant dû</p>
                  <p className="font-bold text-lg">{alert.amount}€</p>
                </div>
              </div>
              <Button
                onClick={() => handleMarkAsPaid(alert)}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Marquer comme payé
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
