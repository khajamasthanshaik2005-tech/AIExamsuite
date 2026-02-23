import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { examService } from '../../services/examService'
import { Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function TakeExam() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})
  const [attempt, setAttempt] = useState(null)
  const [showRules, setShowRules] = useState(true)
  const [detailsStep, setDetailsStep] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [activeIndex, setActiveIndex] = useState(0)
  const editorRefs = useRef({})
  const { user } = useAuth()
  const [meta, setMeta] = useState({
    studentName: '',
    studentId: '',
    college: '',
    branch: '',
    year: '',
    section: ''
  })
  const canvasRefs = useRef({})
  const canvasStateRef = useRef({}) // per questionId: { tool, color, size, opacity, zoom, offset, history, redo, drawing, tempShape }
  const [marksFilter, setMarksFilter] = useState(null)
  const [showNav, setShowNav] = useState(true)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saving', 'saved', 'error'
  const [showPreview, setShowPreview] = useState(false)
  const [attemptStatus, setAttemptStatus] = useState(null)

  useEffect(() => {
    fetchExam()
    checkAttemptStatus()
  }, [id])

  const checkAttemptStatus = async () => {
    try {
      const res = await examService.getAttemptStatus(id)
      const status = res.data?.data
      setAttemptStatus(status)
      if (status && (status.status === 'submitted' || status.status === 'completed' || status.status === 'abandoned')) {
        alert('This exam has already been submitted. You cannot attempt it again.')
        navigate('/my-exams')
      }
    } catch (e) {
      // No attempt yet, that's fine
    }
  }

  const fetchExam = async () => {
    try {
      const response = await examService.getById(id)
      setExam(response.data.data)
    } catch (error) {
      console.error('Error fetching exam:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveTimers = useRef({})
  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    // Debounced autosave
    if (saveTimers.current[questionId]) clearTimeout(saveTimers.current[questionId])
    setSaveStatus('saving')
    saveTimers.current[questionId] = setTimeout(async () => {
      try {
        await examService.submitAnswer({ examId: id, questionId, answerText: answer, autoSaved: true })
        setSaveStatus('saved')
      } catch (e) {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('saved'), 2000)
  }
    }, 800)
  }

  useEffect(() => {
    if (!timeLeft || showRules) return
    const t = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [timeLeft, showRules])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const defaultCanvasState = () => ({
    tool: 'pen', // pen|eraser|line|rect|circle|arrow|pan
    color: '#111827',
    size: 2,
    opacity: 1,
    zoom: 1,
    offset: { x: 0, y: 0 },
    history: [],
    redo: [],
    drawing: false,
    tempShape: null,
    panStart: null
  })

  const getCanvasState = (qid) => {
    if (!canvasStateRef.current[qid]) canvasStateRef.current[qid] = defaultCanvasState()
    return canvasStateRef.current[qid]
  }

  const redraw = (qid) => {
    const canvas = canvasRefs.current[qid]
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const st = getCanvasState(qid)
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.save()
    ctx.translate(st.offset.x, st.offset.y)
    ctx.scale(st.zoom, st.zoom)
    st.history.forEach(cmd => drawCommand(ctx, cmd))
    if (st.tempShape) drawCommand(ctx, st.tempShape, true)
    ctx.restore()
  }

  const drawCommand = (ctx, cmd, preview=false) => {
    ctx.save()
    ctx.globalAlpha = cmd.opacity ?? 1
    ctx.lineWidth = cmd.size ?? 2
    if (cmd.type === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    else ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = cmd.color || '#111827'
    ctx.fillStyle = cmd.color || '#111827'
    switch (cmd.type) {
      case 'pen':
      case 'eraser':
        ctx.beginPath()
        cmd.points.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y) })
        ctx.stroke()
        break
      case 'line': {
        const { start, end } = cmd
        ctx.beginPath(); ctx.moveTo(start.x,start.y); ctx.lineTo(end.x,end.y); ctx.stroke()
        break
      }
      case 'rect': {
        const { start, end } = cmd
        const w = end.x - start.x; const h = end.y - start.y
        ctx.strokeRect(start.x, start.y, w, h)
        break
      }
      case 'circle': {
        const { start, end } = cmd
        const rx = (end.x - start.x)/2; const ry = (end.y - start.y)/2
        const cx = start.x + rx; const cy = start.y + ry
        const r = Math.max(Math.abs(rx), Math.abs(ry))
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke()
        break
      }
      case 'arrow': {
        const { start, end } = cmd
        ctx.beginPath(); ctx.moveTo(start.x,start.y); ctx.lineTo(end.x,end.y); ctx.stroke()
        // arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const headLen = 10 + (cmd.size||2)
        const ax1 = end.x - headLen * Math.cos(angle - Math.PI/6)
        const ay1 = end.y - headLen * Math.sin(angle - Math.PI/6)
        const ax2 = end.x - headLen * Math.cos(angle + Math.PI/6)
        const ay2 = end.y - headLen * Math.sin(angle + Math.PI/6)
        ctx.beginPath(); ctx.moveTo(end.x,end.y); ctx.lineTo(ax1,ay1); ctx.moveTo(end.x,end.y); ctx.lineTo(ax2,ay2); ctx.stroke()
        break
      }
      default: break
    }
    ctx.restore()
  }

  const initCanvas = (qid) => {
    const canvas = canvasRefs.current[qid]
    if (!canvas) return
    const getRawPos = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
      return { x, y }
    }
    const toCanvasPos = (st, p) => ({ x: (p.x - st.offset.x) / st.zoom, y: (p.y - st.offset.y) / st.zoom })
    const down = (e) => {
      e.preventDefault()
      const st = getCanvasState(qid)
      const rp = getRawPos(e)
      if (st.tool === 'pan') { st.panStart = rp; return }
      const p = toCanvasPos(st, rp)
      st.drawing = true
      st.redo = []
      if (st.tool === 'pen' || st.tool === 'eraser') {
        st.tempShape = { type: st.tool==='pen'?'pen':'eraser', points:[p], color: st.color, size: st.size, opacity: st.opacity }
      } else {
        st.tempShape = { type: st.tool, start: p, end: p, color: st.color, size: st.size, opacity: st.opacity }
      }
      redraw(qid)
    }
    const move = (e) => {
      e.preventDefault()
      const st = getCanvasState(qid)
      const rp = getRawPos(e)
      if (st.tool === 'pan' && st.panStart) {
        st.offset.x += (rp.x - st.panStart.x)
        st.offset.y += (rp.y - st.panStart.y)
        st.panStart = rp
        redraw(qid)
        return
      }
      if (!st.drawing || !st.tempShape) return
      const p = toCanvasPos(st, rp)
      if (st.tempShape.type === 'pen' || st.tempShape.type === 'eraser') {
        st.tempShape.points.push(p)
      } else {
        st.tempShape.end = p
      }
      redraw(qid)
    }
    const up = () => {
      const st = getCanvasState(qid)
      if (st.tool === 'pan') { st.panStart = null; return }
      if (st.drawing && st.tempShape) {
        st.history.push(st.tempShape)
        st.tempShape = null
        st.drawing = false
        redraw(qid)
      }
    }
    canvas.onmousedown = down; canvas.onmousemove = move; window.addEventListener('mouseup', up)
    canvas.ontouchstart = (e)=>down(e)
    canvas.ontouchmove = (e)=>move(e)
    canvas.ontouchend = ()=>up()
  }

  const changeZoom = (qid, delta) => {
    const st = getCanvasState(qid)
    const nz = Math.max(0.25, Math.min(4, st.zoom + delta))
    st.zoom = nz
    redraw(qid)
  }

  const undo = (qid) => { const st=getCanvasState(qid); if(st.history.length){ st.redo.push(st.history.pop()); redraw(qid) } }
  const redo = (qid) => { const st=getCanvasState(qid); if(st.redo.length){ st.history.push(st.redo.pop()); redraw(qid) } }

  const saveCanvasAttachment = async (questionId) => {
    const canvas = canvasRefs.current[questionId]
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    try {
      await examService.submitAnswer({ examId: id, questionId, answerText: answers[questionId] || '', autoSaved: false, attachmentDataUrl: dataUrl })
      alert('Diagram attached')
    } catch (e) {
      alert('Failed to attach diagram')
    }
  }

  // Navigation away detection
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return
    
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
      // Mark as abandoned
      examService.abandon(id).catch(() => {})
    }
    
    const handleRouteChange = () => {
      if (attempt && attempt.status === 'in_progress') {
        examService.abandon(id).catch(() => {})
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      handleRouteChange()
    }
  }, [attempt, id])

  const handleFinalSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit? You cannot change your answers after submission.')) {
      return
    }
    
    try {
      // First save all current answers (even empty ones)
      const qs = exam.questions || []
      const saveResults = await Promise.allSettled(qs.map(q => {
        // Ensure answerText is always a string
        let answerText = answers[q._id]
        if (answerText === null || answerText === undefined) {
          answerText = ''
        } else if (typeof answerText !== 'string') {
          answerText = String(answerText)
        }
        
        // Strip HTML tags if it's just empty HTML
        if (answerText.trim() === '' || answerText.trim() === '<br>' || answerText.trim() === '<p></p>') {
          answerText = ''
        }
        
        return examService.submitAnswer({ 
          examId: id, 
          questionId: q._id, 
          answerText: answerText, 
          autoSaved: false 
        }).catch(err => {
          console.error(`Failed to save answer for question ${q._id}:`, err)
          throw err // Re-throw to be caught by Promise.allSettled
        })
      }))
      
      // Check if any errors occurred
      const errors = saveResults.filter(r => r.status === 'rejected')
      if (errors.length > 0) {
        console.error('Some answers failed to save:', errors)
        const errorMessages = errors.map(e => e.reason?.response?.data?.message || e.reason?.message || 'Unknown error')
        console.error('Error details:', errorMessages)
        
        // Check for critical errors (5xx) vs client errors (4xx)
        const criticalErrors = errors.filter(r => r.reason?.response?.status >= 500)
        if (criticalErrors.length > 0) {
          alert(`Warning: Some answers may not have been saved due to server errors. Please try submitting again.`)
          return
        }
        // For 4xx errors, we can still try to submit (maybe some answers were saved)
      }
      
      // Then final submit
      try {
        const res = await examService.finalSubmit(id)
        const data = res.data?.data || {}
        
        if (exam.type === 'quiz') {
          alert(`Quiz submitted! Your score: ${data.score || 0}/${data.maxScore || exam.totalMarks}`)
        } else {
          alert('Exam submitted successfully!')
        }
        
        try { await document.exitFullscreen?.() } catch {}
        navigate('/my-exams')
      } catch (submitError) {
        console.error('Final submit error:', submitError)
        const submitErrorMessage = submitError.response?.data?.message || submitError.message || 'Failed to finalize submission. Your answers may have been saved. Please contact support.'
        alert(submitErrorMessage)
      }
    } catch (e) {
      console.error('Submit error:', e)
      const errorMessage = e.response?.data?.message || e.message || 'Failed to submit exam. Please try again.'
      alert(`Error: ${errorMessage}\n\nPlease check the browser console for more details.`)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  if (!exam) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Exam not found</h3>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Back to Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
          {showRules ? (
            <p className="text-gray-600 mt-2">Total Marks: {exam.totalMarks}</p>
          ) : null}
        </div>

        {showRules && (
          <div className="card bg-primary-50 border-l-4 border-primary-600">
            {detailsStep ? (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">Student Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Name</label>
                    <input className="input-field" value={meta.studentName} onChange={(e)=>setMeta({...meta, studentName:e.target.value})} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Student ID</label>
                    <input className="input-field" value={meta.studentId} onChange={(e)=>setMeta({...meta, studentId:e.target.value})} placeholder="e.g., 99220040195" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">College</label>
                    <input className="input-field" value={meta.college} onChange={(e)=>setMeta({...meta, college:e.target.value})} placeholder="College name" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Branch</label>
                    <input className="input-field" value={meta.branch} onChange={(e)=>setMeta({...meta, branch:e.target.value})} placeholder="e.g., CSE" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Year</label>
                    <input className="input-field" value={meta.year} onChange={(e)=>setMeta({...meta, year:e.target.value})} placeholder="e.g., 2" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="btn-primary" onClick={()=>{ if(!meta.studentName){ alert('Please enter your name'); return; } setDetailsStep(false) }}>Next</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">Rules & Information</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Total time: {exam.duration} minutes</li>
                  <li>Total marks: {exam.totalMarks}</li>
                  <li>No page refresh. Your answers will be saved on submit.</li>
                </ul>
                {exam.instructions && <p className="text-gray-700 mt-2">{exam.instructions}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Section</label>
                    <input className="input-field" value={meta.section} onChange={(e)=>setMeta({...meta, section:e.target.value})} placeholder="e.g., B04" />
                  </div>
                </div>
                <div className="mt-4 flex justify-between">
                  <button className="btn-secondary" onClick={()=>setDetailsStep(true)}>Back</button>
                  <button onClick={async ()=>{ 
                    try {
                      const startRes = await examService.start(id, meta)
                      const attemptData = startRes.data.data
                      setAttempt(attemptData)
                      const durationMinutes = exam?.duration || 60
                      setTimeLeft(durationMinutes * 60)
                      setShowRules(false)
                      
                      // Load existing answers if resuming
                      try {
                        const answersRes = await examService.getExamAnswers(id)
                        const existingAnswers = answersRes.data?.data || []
                        const answersMap = {}
                        existingAnswers.forEach(ans => {
                          if (ans.question && ans.answerText) {
                            answersMap[ans.question._id || ans.question] = ans.answerText
                          }
                        })
                        setAnswers(answersMap)
                      } catch (e) {
                        // No existing answers, that's fine
                      }
                      
                      // Enter fullscreen after starting
                      try { await document.documentElement.requestFullscreen?.() } catch {}
                    } catch (e) {
                      alert(e.response?.data?.message || 'Could not start exam')
                    }
                  }} className="btn-primary">Start Exam</button>
                </div>
              </>
            )}
          </div>
        )}

        {!showRules && !showPreview && (
          <div className="flex items-center justify-between card">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">Attempt ID: {attempt?._id || '—'}</div>
              <div className="text-sm flex items-center gap-2">
                <span className="text-gray-600">Status:</span>
                {saveStatus === 'saving' && <span className="text-yellow-600">Saving...</span>}
                {saveStatus === 'saved' && <span className="text-green-600">✓ Saved</span>}
                {saveStatus === 'error' && <span className="text-red-600">Save failed</span>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowPreview(true)} 
                className="btn-secondary text-sm"
              >
                Preview Answers
              </button>
              <div className="flex items-center text-lg font-semibold text-gray-900">
                <Clock className="h-5 w-5 mr-2 text-primary-600" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        )}

        {showPreview && !showRules && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Preview Your Answers</h2>
              <button onClick={() => setShowPreview(false)} className="btn-secondary">
                Back to Exam
              </button>
            </div>
            <p className="text-gray-600 mb-4">Review all your answers before final submission. You can go back to edit any answer.</p>
          <div className="space-y-6">
              {(exam.questions || [])
                .filter(q => exam.type === 'quiz' ? q.type === 'multiple_choice' : true)
                .map((question, index) => {
                  const answer = answers[question._id] || ''
                  const hasAnswer = answer && String(answer).trim() !== ''
                  return (
                    <div key={question._id} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Question {index + 1}</h3>
                        <span className="text-sm text-gray-600">{question.marks} marks</span>
                      </div>
                      <p className="text-gray-700 mb-3">{question.text}</p>
                      <div className="bg-gray-50 p-3 rounded">
                        {hasAnswer ? (
                          <div dangerouslySetInnerHTML={{ __html: answer }} className="text-gray-800" />
                        ) : (
                          <p className="text-gray-400 italic">No answer provided</p>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          setShowPreview(false)
                          setActiveIndex(index)
                        }}
                        className="mt-2 text-sm text-primary-600 hover:underline"
                      >
                        Edit Answer
                      </button>
                    </div>
                  )
                })}
            </div>
            <div className="mt-6 flex gap-4">
              <button onClick={() => setShowPreview(false)} className="btn-secondary flex-1">
                Back to Exam
              </button>
              <button onClick={handleFinalSubmit} className="btn-primary flex-1 text-lg py-3">
                Submit Final Answers
              </button>
            </div>
          </div>
        )}

        {!showRules && !showPreview ? (exam.questions && exam.questions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className={`${showNav ? 'block' : 'hidden lg:hidden'} lg:col-span-1 card lg:block`}>
              <h3 className="font-semibold mb-2">Questions</h3>
              {exam.type !== 'quiz' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600">Filter by marks:</span>
                <select className="input-field py-1 text-sm" value={marksFilter||''} onChange={(e)=>{
                  const v = e.target.value; setMarksFilter(v?parseInt(v):null); setActiveIndex(0)
                }}>
                  <option value="">All</option>
                  {Array.from(new Set((exam.questions||[]).map(q=>parseInt(q.marks)).filter(v=>!isNaN(v)))).sort((a,b)=>a-b).map(m=>(
                    <option key={m} value={m}>{m} marks</option>
                  ))}
                </select>
              </div>
              )}
              <div className="grid grid-cols-6 gap-2">
                {(exam.questions||[])
                  .filter(q => exam.type === 'quiz' ? q.type === 'multiple_choice' : true)
                  .filter(q => exam.type==='quiz' ? true : (marksFilter? parseInt(q.marks)===marksFilter : true))
                  .map((q, i) => {
                    const attempted = !!(answers[q._id] && String(answers[q._id]).trim() !== '')
                    const isActive = activeIndex === i
                    const base = 'px-2 py-1 rounded text-sm border'
                    const cls = isActive
                      ? `${base} bg-primary-600 text-white border-primary-600`
                      : attempted
                        ? `${base} bg-green-100 text-green-800 border-green-400 hover:bg-green-200`
                        : `${base} bg-white hover:bg-gray-50`
                    return (
                  <button
                    key={q._id}
                    onClick={() => setActiveIndex(i)}
                    className={cls}
                  >{i+1}</button>
                )})}
              </div>
            </div>
            <div className={`${showNav ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
              <div className="flex justify-end">
                <button className="btn-secondary text-sm" onClick={()=>setShowNav(v=>!v)}>{showNav ? 'Hide Navigator' : 'Show Navigator'}</button>
              </div>
              {(exam.questions||[])
                .filter(q => exam.type === 'quiz' ? q.type === 'multiple_choice' : true)
                .filter(q => exam.type==='quiz' ? true : (marksFilter? parseInt(q.marks)===marksFilter : true))
                .map((question, index) => (
                index === activeIndex && (
              <div key={question._id} className="card">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Question {index + 1}
                  </h3>
                  <span className="text-sm text-gray-600">
                    {question.marks} marks
                  </span>
                </div>
                <p className="text-gray-900 mb-4">{question.text}</p>
                <div className="space-y-3">
                  {question.type === 'multiple_choice' && question.options ? (
                    question.options.map((option, optIndex) => (
                      <label key={optIndex} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded">
                        <input
                          type="radio"
                          name={`question-${question._id}`}
                          value={option.text}
                          checked={answers[question._id] === option.text}
                          onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="text-gray-700">{option.text}</span>
                      </label>
                    ))
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <button type="button" className="btn-secondary text-sm" onClick={() => document.execCommand('bold')}>Bold</button>
                        <button type="button" className="btn-secondary text-sm" onClick={() => document.execCommand('italic')}>Italic</button>
                        <button type="button" className="btn-secondary text-sm" onClick={() => document.execCommand('underline')}>Underline</button>
                        <button type="button" className="btn-secondary text-sm" onClick={() => {
                          const rows = parseInt(prompt('Rows?', '3')) || 3
                          const cols = parseInt(prompt('Columns?', '3')) || 3
                          const cells = Array.from({length: rows}).map(()=>'<tr>'+Array.from({length: cols}).map(()=>'<td style=\"border:1px solid #ddd;padding:6px\">&nbsp;</td>').join('')+'</tr>').join('')
                          const html = `<table style=\"border-collapse:collapse;width:100%;margin:6px 0\"><tbody>${cells}</tbody></table>`
                          document.execCommand('insertHTML', false, html)
                        }}>Insert Table</button>
                        <button type="button" className="btn-secondary text-sm" onClick={() => {
                          const sel = window.getSelection()
                          if (!sel || sel.rangeCount === 0) return
                          let node = sel.anchorNode
                          if (!node) return
                          if (node.nodeType === 3) node = node.parentNode
                          while (node && node.tagName !== 'TABLE') node = node.parentNode
                          if (node && node.tagName === 'TABLE') node.remove()
                        }}>Delete Table</button>
                      </div>
                      <div
                        ref={(el) => { 
                          editorRefs.current[question._id] = el
                          if (el && answers[question._id] && el.innerHTML !== answers[question._id]) {
                            el.innerHTML = answers[question._id]
                          }
                        }}
                        contentEditable
                        className="p-3 border rounded min-h-[120px] focus:outline-none"
                        onInput={(e) => handleAnswerChange(question._id, e.currentTarget.innerHTML)}
                      placeholder="Type your answer here..."
                        suppressContentEditableWarning
                    />
                      <small className="text-gray-500">Use the toolbar to format your answer.</small>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Diagram (optional)</label>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <select className="input-field py-1 text-sm w-32" value={getCanvasState(question._id).tool} onChange={(e)=>{ getCanvasState(question._id).tool = e.target.value; }}>
                            <option value="pen">Pen</option>
                            <option value="eraser">Eraser</option>
                            <option value="line">Line</option>
                            <option value="rect">Rectangle</option>
                            <option value="circle">Circle</option>
                            <option value="arrow">Arrow</option>
                            <option value="pan">Pan</option>
                          </select>
                          <input type="color" className="h-9 w-9 border rounded" value={getCanvasState(question._id).color} onChange={(e)=>{ getCanvasState(question._id).color = e.target.value; }} />
                          <div className="flex items-center gap-2 text-sm">
                            <span>Size</span>
                            <input type="range" min="1" max="20" value={getCanvasState(question._id).size} onChange={(e)=>{ getCanvasState(question._id).size = parseInt(e.target.value); }} />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span>Opacity</span>
                            <input type="range" min="10" max="100" value={Math.round(getCanvasState(question._id).opacity*100)} onChange={(e)=>{ getCanvasState(question._id).opacity = parseInt(e.target.value)/100; }} />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <button type="button" className="btn-secondary" onClick={()=>undo(question._id)}>Undo</button>
                            <button type="button" className="btn-secondary" onClick={()=>redo(question._id)}>Redo</button>
                            <button type="button" className="btn-secondary" onClick={()=>changeZoom(question._id, 0.25)}>Zoom +</button>
                            <button type="button" className="btn-secondary" onClick={()=>changeZoom(question._id, -0.25)}>Zoom -</button>
                          </div>
                        </div>
                        <div className="border rounded w-full overflow-auto" style={{maxHeight:'450px'}}>
                          <canvas ref={(el)=>{canvasRefs.current[question._id]=el; if(el) setTimeout(()=>initCanvas(question._id),0)}} width="1200" height="800" className="block"></canvas>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button type="button" className="btn-secondary" onClick={()=>{ const c=canvasRefs.current[question._id]; if(!c) return; const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); const st=getCanvasState(question._id); st.history=[]; st.redo=[]; st.offset={x:0,y:0}; st.zoom=1; }}>Clear</button>
                          <button type="button" className="btn-primary" onClick={()=>saveCanvasAttachment(question._id)}>Attach Diagram</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              ) ))}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i)=> Math.max(0, i-1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={activeIndex >= ((exam.questions||[]).filter(q => exam.type==='quiz'? q.type==='multiple_choice' : true).filter(q => exam.type==='quiz' ? true : (marksFilter? parseInt(q.marks)===marksFilter : true)).length - 1)}
                  onClick={() => setActiveIndex((i)=> i+1)}
                >
                  Next
                </button>
              </div>
              <div className="flex-1"></div>
              <button onClick={() => setShowPreview(true)} className="btn-primary flex-1 text-lg py-3">
                Preview & Submit
              </button>
              <button onClick={async () => {
                if (window.confirm('Are you sure you want to leave? Your exam will be marked as abandoned.')) {
                  try {
                    await examService.abandon(id)
                  } catch (e) {}
                  navigate('/my-exams')
                }
              }} className="btn-secondary flex-1 text-lg py-3">
                Cancel
              </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600">No questions available in this exam</p>
          </div>
        )) : null}
      </div>
    </Layout>
  )
}