"use server"

import { getSupabaseClient } from "@/lib/supabase/server"

type PaymentAlert = {
  id: string
  studentId: string
  studentName: string
  subjectLevelId: string
  subjectName: string
  levelName: string
  attendanceCount: number
  expectedAttendance: number
  amount: number
  timesPerWeek: number
}

export async function getPaymentAlerts(): Promise<{ success: boolean; alerts?: PaymentAlert[]; error?: string }> {
  try {
    const supabase = getSupabaseClient()

    // Get current month in YYYY-MM format
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM

    // Get all student attendances for current month
    const { data: attendances, error: attendanceError } = await supabase
      .from("student_attendance")
      .select(`
        student_id,
        subject_level_id,
        attendance_date,
        present,
        students!inner (
          id,
          first_name,
          last_name
        ),
        subject_levels!inner (
          id,
          times_per_week,
          price_per_month,
          subjects!inner (
            name
          ),
          levels!inner (
            name
          )
        )
      `)
      .gte("attendance_date", `${currentMonth}-01`)
      .lte("attendance_date", `${currentMonth}-31`)
      .eq("present", true)

    if (attendanceError) {
      console.error("[getPaymentAlerts] Attendance query error:", attendanceError)
      return { success: false, error: "Failed to fetch attendance data" }
    }

    // Group attendances by student and subject_level
    const attendanceMap = new Map<string, { count: number; data: any }>()
    attendances?.forEach((att) => {
      const key = `${att.student_id}-${att.subject_level_id}`
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          count: 0,
          data: {
            studentId: att.student_id,
            studentName: `${att.students.first_name} ${att.students.last_name}`,
            subjectLevelId: att.subject_level_id,
            subjectName: att.subject_levels.subjects.name,
            levelName: att.subject_levels.levels.name,
            timesPerWeek: att.subject_levels.times_per_week,
            pricePerMonth: att.subject_levels.price_per_month,
          }
        })
      }
      attendanceMap.get(key)!.count++
    })

    // Get existing payments for current month
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("student_id, subject_level_id, month_paid_for")
      .eq("month_paid_for", currentMonth)

    if (paymentError) {
      console.error("[getPaymentAlerts] Payment query error:", paymentError)
      return { success: false, error: "Failed to fetch payment data" }
    }

    // Create set of paid student-subject_level combinations
    const paidSet = new Set<string>()
    payments?.forEach((payment) => {
      paidSet.add(`${payment.student_id}-${payment.subject_level_id}`)
    })

    // Filter attendances that meet criteria and haven't been paid
    const alerts: PaymentAlert[] = []
    attendanceMap.forEach(({ count, data }) => {
      const expectedAttendance = 4 // As per task: four times a month
      if (count >= expectedAttendance) {
        const key = `${data.studentId}-${data.subjectLevelId}`
        if (!paidSet.has(key)) {
          alerts.push({
            id: key,
            studentId: data.studentId,
            studentName: data.studentName,
            subjectLevelId: data.subjectLevelId,
            subjectName: data.subjectName,
            levelName: data.levelName,
            attendanceCount: count,
            expectedAttendance,
            amount: data.pricePerMonth,
            timesPerWeek: data.timesPerWeek,
          })
        }
      }
    })

    return { success: true, alerts }
  } catch (error) {
    console.error("[getPaymentAlerts] Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function recordPayment({
  studentId,
  subjectLevelId,
  amount,
  paymentDate,
  monthPaidFor,
}: {
  studentId: string
  subjectLevelId: string
  amount: number
  paymentDate: string
  monthPaidFor: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from("payments")
      .insert({
        student_id: studentId,
        subject_level_id: subjectLevelId,
        amount,
        payment_date: paymentDate,
        month_paid_for: monthPaidFor,
      })

    if (error) {
      console.error("[recordPayment] Insert error:", error)
      return { success: false, error: "Failed to record payment" }
    }

    return { success: true }
  } catch (error) {
    console.error("[recordPayment] Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
