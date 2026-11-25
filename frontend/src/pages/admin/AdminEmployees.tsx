import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, UnlockKeyhole, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse } from '../../lib/types'
import { type Employee, type EmployeeForm, Failure, Loading, blankForm } from './admin-helpers'

export function AdminEmployees() {
  const qc = useQueryClient()
  const [form, setForm] = useState<EmployeeForm>(blankForm)
  const [showForm, setShowForm] = useState(false)
  const employees = useQuery({ queryKey: ['admin-employees'], queryFn: () => request(api.get<ApiResponse<Employee[]>>('/admin/employees')) })
  const create = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<Employee>>('/admin/employees/receptionists', {
          ...form,
          salary: form.salary ? Number(form.salary.replaceAll('.', '')) : null,
          deskNumber: form.deskNumber ? Number(form.deskNumber) : null,
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã tạo tài khoản lễ tân.')
      setForm(blankForm())
      setShowForm(false)
      await qc.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const toggle = useMutation({
    mutationFn: ({ employee, active }: { employee: Employee; active: boolean }) =>
      request(api.patch<ApiResponse<Employee>>(`/admin/employees/${employee.id}/active`, undefined, { params: { active } })),
    onSuccess: async () => {
      toast.success('Đã cập nhật trạng thái tài khoản.')
      await qc.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div className="ops-page">
      <div className="ops-title">
        <div>
          <span className="section-kicker">NHÂN SỰ</span>
          <h2>Tài khoản nhân viên</h2>
          <p>Tạo tài khoản lễ tân và quản lý trạng thái truy cập hệ thống.</p>
        </div>
        <button className="button button-dark" onClick={() => setShowForm((v) => !v)}>
          <UserPlus size={16} /> {showForm ? 'Đóng biểu mẫu' : 'Thêm lễ tân'}
        </button>
      </div>
      {showForm && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">TẠO TÀI KHOẢN</span>
              <h3>Thông tin lễ tân</h3>
            </div>
          </div>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate()
            }}
          >
            <div className="form-grid">
              <label className="form-field">
                <span>Tên đăng nhập</span>
                <input required maxLength={50} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Mật khẩu (tối thiểu 8 ký tự)</span>
                <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Họ và tên</span>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Số điện thoại</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Mã nhân viên</span>
                <input required value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Lương (VND)</span>
                <input
                  inputMode="numeric"
                  value={form.salary.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  onChange={(e) => setForm({ ...form, salary: e.target.value.replace(/\D/g, '') })}
                />
              </label>
              <label className="form-field">
                <span>Ngày vào làm</span>
                <input type="date" required value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Số quầy</span>
                <input type="number" min="0" value={form.deskNumber} onChange={(e) => setForm({ ...form, deskNumber: e.target.value })} />
              </label>
            </div>
            <button className="button button-dark" disabled={create.isPending}>
              {create.isPending ? 'Đang tạo…' : 'Tạo tài khoản'}
            </button>
          </form>
        </section>
      )}
      {employees.isPending ? (
        <Loading />
      ) : employees.isError ? (
        <Failure error={employees.error} retry={() => void employees.refetch()} />
      ) : (
        <section className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>NHÂN VIÊN</th>
                  <th>MÃ NHÂN VIÊN</th>
                  <th>VAI TRÒ</th>
                  <th>NGÀY VÀO LÀM</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {employees.data!.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <b>{employee.fullName}</b>
                      <small className="cell-sub">
                        {employee.username} · {employee.email}
                      </small>
                    </td>
                    <td>{employee.employeeCode || '—'}</td>
                    <td>
                      {employee.role === 'ROLE_ADMIN'
                        ? 'Quản trị viên'
                        : `Lễ tân${employee.deskNumber ? ` · Quầy ${employee.deskNumber}` : ''}`}
                    </td>
                    <td>{employee.hireDate || '—'}</td>
                    <td>
                      <span className={`status-badge ${employee.accountStatus === 'ACTIVE' ? 'green' : 'gray'}`}>
                        <i />
                        {employee.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td>
                      {employee.role === 'ROLE_ADMIN' ? (
                        <span>—</span>
                      ) : (
                        <button
                          className="table-action"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ employee, active: employee.accountStatus !== 'ACTIVE' })}
                        >
                          {employee.accountStatus === 'ACTIVE' ? (
                            <>
                              <LockKeyhole size={14} /> Khóa tài khoản
                            </>
                          ) : (
                            <>
                              <UnlockKeyhole size={14} /> Mở khóa
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!employees.data!.length && <div className="empty-table">Chưa có tài khoản nhân viên.</div>}
          </div>
        </section>
      )}
    </div>
  )
}
