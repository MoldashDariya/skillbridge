import { SkillyWidget } from "@/components/skilly-widget"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SkillyWidget />
    </>
  )
}
