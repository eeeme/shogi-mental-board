import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShogiBoard } from './ShogiBoard'
import { CELL_COUNT } from '../lib/coords'

describe('ShogiBoard', () => {
  it('81 マスを描画する', () => {
    render(<ShogiBoard />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(CELL_COUNT)
  })

  it('マスのタップで onCellTap が該当マスを返す', async () => {
    const onCellTap = vi.fn()
    render(<ShogiBoard onCellTap={onCellTap} />)
    await userEvent.click(screen.getByRole('gridcell', { name: '7六' }))
    expect(onCellTap).toHaveBeenCalledWith({ file: 7, rank: 6 })
  })

  it('ハイライトされたマスは aria-pressed=true / data-role=correct', () => {
    render(<ShogiBoard highlight={{ file: 5, rank: 5 }} />)
    const cell = screen.getByRole('gridcell', { name: '5五' })
    expect(cell).toHaveAttribute('aria-pressed', 'true')
    expect(cell).toHaveAttribute('data-role', 'correct')
  })

  it('誤タップマスは data-role=error、正解マスは correct を同時表示', () => {
    render(
      <ShogiBoard
        highlight={{ file: 7, rank: 6 }}
        errorHighlight={{ file: 3, rank: 4 }}
      />,
    )
    expect(screen.getByRole('gridcell', { name: '7六' })).toHaveAttribute(
      'data-role',
      'correct',
    )
    expect(screen.getByRole('gridcell', { name: '3四' })).toHaveAttribute(
      'data-role',
      'error',
    )
  })
})
