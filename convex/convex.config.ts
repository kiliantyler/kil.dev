import rag from '@convex-dev/rag/convex.config'
import workOSAuthKit from '@convex-dev/workos-authkit/convex.config'
import { defineApp } from 'convex/server'

const app = defineApp()
app.use(workOSAuthKit)
app.use(rag)

export default app
