import { redirect } from 'next/navigation'
import { getMe } from '@/lib/session'
import { isProduct } from '@/lib/perm'
import { PageHead } from '@/components/ui'
import NewLaunchForm from './NewLaunchForm'

export default async function NewLaunch() {
  const me = (await getMe())!
  if (!isProduct(me)) redirect('/launches')
  return (
    <>
      <PageHead title="New launch" sub="Name it, set the window, and list the products." />
      <div className="max-w-3xl"><NewLaunchForm /></div>
    </>
  )
}
