// @ts-ignore
import script from "./scripts/workbench.inline"
import styles from "./styles/workbench.scss"
import { QuartzComponent, QuartzComponentConstructor } from "./types"

const WorkbenchHome: QuartzComponent = () => null

WorkbenchHome.afterDOMLoaded = script
WorkbenchHome.css = styles

export default (() => WorkbenchHome) satisfies QuartzComponentConstructor
