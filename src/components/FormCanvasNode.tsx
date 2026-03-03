import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const FormCanvasNode = memo(({ data }: NodeProps) => {
  const d = data as Record<string, any>;
  const [form, setForm] = useState({ a: '', b: '', c: '' });
  const [submittedAt, setSubmittedAt] = useState('');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="custom-node canvas-form-node">
      <Handle type="target" position={Position.Left} />
      <div className="canvas-form-header">Canvas Form</div>
      <form className="canvas-form-body" onSubmit={onSubmit}>
        <input
          className="form-input nodrag"
          placeholder="Field 1"
          value={form.a}
          onChange={(e) => setForm((prev) => ({ ...prev, a: e.target.value }))}
        />
        <input
          className="form-input nodrag"
          placeholder="Field 2"
          value={form.b}
          onChange={(e) => setForm((prev) => ({ ...prev, b: e.target.value }))}
        />
        <input
          className="form-input nodrag"
          placeholder="Field 3"
          value={form.c}
          onChange={(e) => setForm((prev) => ({ ...prev, c: e.target.value }))}
        />
        <button type="submit" className="shuffle-btn nodrag">Submit</button>
      </form>
      {submittedAt && <div className="form-meta">Last submit: {submittedAt}</div>}
      {d?.title && <div className="canvas-form-hint">{String(d.title)}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

FormCanvasNode.displayName = 'FormCanvasNode';
export default FormCanvasNode;
