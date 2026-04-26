"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, DollarSign } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"

interface Student {
  id: string
  first_name: string
  last_name: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  created_at: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  subject_levels?: {
    subjects: { name: string }
    levels: { name: string }
  }
}

export default function StudentSection() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("last_name")

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudentPayments = async (studentId: string) => {
    try {
      setIsPaymentsLoading(true)
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_date,
          month_paid_for,
          subject_levels (
            subjects (name),
            levels (name)
          )
        `)
        .eq("student_id", studentId)
        .order("payment_date", { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setIsPaymentsLoading(false)
    }
  }

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student)
    fetchStudentPayments(student.id)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="text-muted-foreground">Manage student information and payment history</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students.length})
            </CardTitle>
            <CardDescription>Click on a student to view their details and payment history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.map((student) => (
                <Button
                  key={student.id}
                  variant={selectedStudent?.id === student.id ? "default" : "outline"}
                  className="w-full justify-start h-auto p-4"
                  onClick={() => handleStudentClick(student)}
                >
                  <div className="text-left">
                    <div className="font-medium">
                      {student.first_name} {student.last_name}
                    </div>
                    {student.parent_name && (
                      <div className="text-sm text-muted-foreground">
                        Parent: {student.parent_name}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : "Select a Student"}
            </CardTitle>
            {selectedStudent && (
              <CardDescription>
                Student details and payment history
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Parent:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.parent_name || "Not specified"}
                    </p>
                  </div>
                  {selectedStudent.parent_phone && (
                    <div>
                      <span className="text-sm font-medium">Parent Phone:</span>
                      <p className="text-sm text-muted-foreground">
                        {selectedStudent.parent_phone}
                      </p>
                    </div>
                  )}
                  {selectedStudent.parent_email && (
                    <div>
                      <span className="text-sm font-medium">Parent Email:</span>
                      <p className="text-sm text-muted-foreground">
                        {selectedStudent.parent_email}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium">Enrolled:</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedStudent.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment History
                  </h3>
                  {isPaymentsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading payments...</p>
                  ) : payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {payment.subject_levels?.subjects?.name} - {payment.subject_levels?.levels?.name}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {payment.month_paid_for}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Paid on {new Date(payment.payment_date).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Select a student from the list to view their details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
