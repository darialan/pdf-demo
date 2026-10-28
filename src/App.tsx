import { DEMO_SCENES } from './demo';
import { PrintWorkbench } from './ui';

function App() {
  return (
    <div>
      <PrintWorkbench scenes={DEMO_SCENES} />
    </div>
  );
}

export default App;
