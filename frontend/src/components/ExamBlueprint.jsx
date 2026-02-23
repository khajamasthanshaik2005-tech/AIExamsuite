import { useState } from 'react'
import { Info, Plus, Trash2, AlertCircle } from 'lucide-react'

export default function ExamBlueprint({ 
  totalMarks, 
  examType, 
  topics = [], 
  onChange,
  initialBlueprint = {}
}) {
  const [marksDistribution, setMarksDistribution] = useState(
    initialBlueprint.marksDistribution || {}
  )
  const [difficultyRatio, setDifficultyRatio] = useState(
    initialBlueprint.difficultyRatio || { easy: 30, medium: 50, hard: 20 }
  )
  const [topicDifficultyMap, setTopicDifficultyMap] = useState(
    initialBlueprint.topicDifficultyMap || {}
  )
  const [bloomsDistribution, setBloomsDistribution] = useState(
    initialBlueprint.bloomsDistribution || {
      remember: 10, understand: 30, apply: 40, analyze: 15, evaluate: 5, create: 0
    }
  )
  const [examStructure, setExamStructure] = useState(
    initialBlueprint.examStructure || []
  )
  const [sections, setSections] = useState(
    initialBlueprint.sections || []
  )
  const [includeModelAnswers, setIncludeModelAnswers] = useState(
    initialBlueprint.includeModelAnswers !== undefined ? initialBlueprint.includeModelAnswers : true
  )
  const [includeDiagrams, setIncludeDiagrams] = useState(
    initialBlueprint.includeDiagrams !== undefined ? initialBlueprint.includeDiagrams : false
  )
  
  const [newMarksItem, setNewMarksItem] = useState({ marks: '', count: '' })
  const [showMarksInput, setShowMarksInput] = useState(false)

  // Calculate total marks from distribution
  const calculateTotal = () => {
    return Object.entries(marksDistribution).reduce((sum, [marks, count]) => {
      return sum + (parseInt(marks) * parseInt(count))
    }, 0)
  }

  const totalFromDistribution = calculateTotal()
  const marksDifference = totalMarks - totalFromDistribution

  // Update parent when blueprint changes
  const updateBlueprint = (updates) => {
    const newBlueprint = {
      marksDistribution,
      difficultyRatio,
      topicDifficultyMap,
      bloomsDistribution,
      examStructure,
      sections,
      includeModelAnswers,
      includeDiagrams,
      ...updates
    }
    if (onChange) {
      onChange(newBlueprint)
    }
  }

  const handleAddMarksDistribution = () => {
    if (newMarksItem.marks && newMarksItem.count) {
      const newDist = {
        ...marksDistribution,
        [newMarksItem.marks]: parseInt(newMarksItem.count)
      }
      setMarksDistribution(newDist)
      setNewMarksItem({ marks: '', count: '' })
      setShowMarksInput(false)
      updateBlueprint({ marksDistribution: newDist })
    }
  }

  const handleRemoveMarksDistribution = (marks) => {
    const newDist = { ...marksDistribution }
    delete newDist[marks]
    setMarksDistribution(newDist)
    updateBlueprint({ marksDistribution: newDist })
  }

  const handleDifficultyRatioChange = (level, value) => {
    const newRatio = { ...difficultyRatio, [level]: parseInt(value) || 0 }
    setDifficultyRatio(newRatio)
    updateBlueprint({ difficultyRatio: newRatio })
  }

  const handleTopicDifficultyChange = (topicId, difficulty) => {
    const newMap = { ...topicDifficultyMap, [topicId]: difficulty }
    setTopicDifficultyMap(newMap)
    updateBlueprint({ topicDifficultyMap: newMap })
  }

  const handleBloomsChange = (level, value) => {
    const newBlooms = { ...bloomsDistribution, [level]: parseInt(value) || 0 }
    setBloomsDistribution(newBlooms)
    updateBlueprint({ bloomsDistribution: newBlooms })
  }

  const handleAddPart = () => {
    const newPart = {
      partName: `Part ${String.fromCharCode(65 + examStructure.length)}`,
      totalMarks: 0,
      questionCount: 0,
      instructions: ''
    }
    const newStructure = [...examStructure, newPart]
    setExamStructure(newStructure)
    updateBlueprint({ examStructure: newStructure })
  }

  const handlePartChange = (index, field, value) => {
    const newStructure = [...examStructure]
    newStructure[index] = { ...newStructure[index], [field]: value }
    setExamStructure(newStructure)
    updateBlueprint({ examStructure: newStructure })
  }

  const handleRemovePart = (index) => {
    const newStructure = examStructure.filter((_, i) => i !== index)
    setExamStructure(newStructure)
    updateBlueprint({ examStructure: newStructure })
  }

  const handleAddSection = () => {
    const newSection = {
      name: `Section ${String.fromCharCode(65 + sections.length)}`,
      instructions: '',
      marksAllowed: [],
      choiceRules: {}
    }
    const newSections = [...sections, newSection]
    setSections(newSections)
    updateBlueprint({ sections: newSections })
  }

  const handleSectionChange = (index, field, value) => {
    const newSections = [...sections]
    newSections[index] = { ...newSections[index], [field]: value }
    setSections(newSections)
    updateBlueprint({ sections: newSections })
  }

  const handleMarksAllowedChange = (index, value) => {
    const list = value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v))
    handleSectionChange(index, 'marksAllowed', list)
  }

  const handleChoiceRuleChange = (index, marksKey, field, value) => {
    const newSections = [...sections]
    const prev = newSections[index].choiceRules || {}
    const existing = prev[marksKey] || { selectAny: 0, total: 0, groupLabel: '' }
    const updated = { ...existing, [field]: field === 'groupLabel' ? value : parseInt(value) || 0 }
    newSections[index] = { ...newSections[index], choiceRules: { ...prev, [marksKey]: updated } }
    setSections(newSections)
    updateBlueprint({ sections: newSections })
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Exam Blueprint</h3>
          <p className="text-sm text-gray-600 mt-1">Plan your exam structure and question distribution</p>
        </div>
        <Info className="h-5 w-5 text-blue-500" />
      </div>

      {/* Marks Distribution */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Marks Distribution</h4>
        <div className="space-y-2">
          {Object.entries(marksDistribution).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(marksDistribution).map(([marks, count]) => (
                <div key={marks} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <span className="text-sm">
                    <span className="font-medium">{count}</span> question(s) × 
                    <span className="font-medium"> {marks}</span> mark(s) = 
                    <span className="font-semibold text-blue-600"> {count * marks}</span> marks
                  </span>
                  <button
                    onClick={() => handleRemoveMarksDistribution(marks)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm">
                  <span className={marksDifference === 0 ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                    Total: {totalFromDistribution}/{totalMarks} marks
                    {marksDifference !== 0 && ` (${marksDifference > 0 ? '+' : ''}${marksDifference} remaining)`}
                  </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No marks distribution set. Questions will be auto-distributed.</p>
          )}
          
          {showMarksInput ? (
            <div className="flex gap-2 p-3 bg-blue-50 rounded border border-blue-200">
              <input
                type="number"
                placeholder="Marks"
                value={newMarksItem.marks}
                onChange={(e) => setNewMarksItem({ ...newMarksItem, marks: e.target.value })}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
              <input
                type="number"
                placeholder="Count"
                value={newMarksItem.count}
                onChange={(e) => setNewMarksItem({ ...newMarksItem, count: e.target.value })}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
              <button
                type="button"
                onClick={handleAddMarksDistribution}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMarksInput(false)
                  setNewMarksItem({ marks: '', count: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMarksInput(true)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Marks Distribution
            </button>
          )}
          
          {marksDifference !== 0 && marksDifference < 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              Total marks exceed exam total. Please adjust.
            </div>
          )}
        </div>
      </div>

      {/* Difficulty Ratio */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Overall Difficulty Ratio (%)</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Easy</label>
            <input
              type="number"
              value={difficultyRatio.easy}
              onChange={(e) => handleDifficultyRatioChange('easy', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Medium</label>
            <input
              type="number"
              value={difficultyRatio.medium}
              onChange={(e) => handleDifficultyRatioChange('medium', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Hard</label>
            <input
              type="number"
              value={difficultyRatio.hard}
              onChange={(e) => handleDifficultyRatioChange('hard', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Total: {difficultyRatio.easy + difficultyRatio.medium + difficultyRatio.hard}%
          {difficultyRatio.easy + difficultyRatio.medium + difficultyRatio.hard !== 100 && ' (Should total 100%)'}
        </p>
      </div>

      {/* Topic Difficulty */}
      {topics.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Difficulty Level per Topic</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {topics.map((topic) => (
              <div key={topic._id || topic} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm flex-1">{topic.title || topic}</span>
                <select
                  value={topicDifficultyMap[topic._id || topic] || 'medium'}
                  onChange={(e) => handleTopicDifficultyChange(topic._id || topic, e.target.value)}
                  className="ml-2 px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloom's Taxonomy */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Bloom's Taxonomy Distribution (%)</h4>
        <div className="grid grid-cols-3 gap-3">
          {['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].map((level) => (
            <div key={level}>
              <label className="block text-sm text-gray-600 mb-1 capitalize">{level}</label>
              <input
                type="number"
                value={bloomsDistribution[level] || 0}
                onChange={(e) => handleBloomsChange(level, e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Exam Structure (Part A, Part B, etc.) */}
      {(examType === 'sessional' || examType === 'semester') && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Exam Structure</h4>
            <button
              type="button"
              onClick={handleAddPart}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Part
            </button>
          </div>
          <div className="space-y-3">
            {examStructure.map((part, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded border">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={part.partName}
                    onChange={(e) => handlePartChange(index, 'partName', e.target.value)}
                    className="font-medium text-gray-900 bg-white px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => handleRemovePart(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={part.totalMarks}
                      onChange={(e) => handlePartChange(index, 'totalMarks', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Question Count</label>
                    <input
                      type="number"
                      value={part.questionCount}
                      onChange={(e) => handlePartChange(index, 'questionCount', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="0"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">Instructions (optional)</label>
                  <input
                    type="text"
                    value={part.instructions}
                    onChange={(e) => handlePartChange(index, 'instructions', e.target.value)}
                    placeholder="e.g., Answer All Questions"
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections (marks per section + choice rules) */}
      {(examType === 'sessional' || examType === 'semester') && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Sections and Marks Rules</h4>
            <button
              type="button"
              onClick={handleAddSection}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Section
            </button>
          </div>
          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded border">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => handleSectionChange(idx, 'name', e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Allowed marks e.g., 2,8,16"
                    value={(section.marksAllowed || []).join(',')}
                    onChange={(e) => handleMarksAllowedChange(idx, e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Instructions (optional)"
                    value={section.instructions || ''}
                    onChange={(e) => handleSectionChange(idx, 'instructions', e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(
                    ((section.marksAllowed && section.marksAllowed.length > 0)
                      ? section.marksAllowed
                      : [8, 16]
                    ).filter(m => parseInt(m) >= 8)
                  ).sort((a,b)=>parseInt(a)-parseInt(b)).map(mk => (
                    <div key={mk} className="bg-white p-3 border rounded">
                      <div className="text-sm font-medium mb-2">Choice Rules for {mk} marks</div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Select Any</label>
                          <input
                            type="number"
                            min="0"
                            value={section.choiceRules?.[mk]?.selectAny || 0}
                            onChange={(e) => handleChoiceRuleChange(idx, mk, 'selectAny', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Total</label>
                          <input
                            type="number"
                            min="0"
                            value={section.choiceRules?.[mk]?.total || 0}
                            onChange={(e) => handleChoiceRuleChange(idx, mk, 'total', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Group Label</label>
                          <input
                            type="text"
                            placeholder="e.g., A, B"
                            value={section.choiceRules?.[mk]?.groupLabel || ''}
                            onChange={(e) => handleChoiceRuleChange(idx, mk, 'groupLabel', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="text-sm text-gray-500">No sections added. Add sections to restrict marks per section and configure choices for 8/16 marks.</p>
            )}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Options</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeModelAnswers}
              onChange={(e) => {
                setIncludeModelAnswers(e.target.checked)
                updateBlueprint({ includeModelAnswers: e.target.checked })
              }}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Include Model Answers</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeDiagrams}
              onChange={(e) => {
                setIncludeDiagrams(e.target.checked)
                updateBlueprint({ includeDiagrams: e.target.checked })
              }}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Include Diagram/Table Questions</span>
          </label>
        </div>
      </div>
    </div>
  )
}

