"use client"

import { useEffect, useRef, useState } from 'react'
import cytoscape, { Core, NodeSingular } from 'cytoscape'
import coseBilkent from 'cytoscape-cose-bilkent'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Register layout
if (typeof cytoscape !== 'undefined') {
  cytoscape.use(coseBilkent)
}

interface GraphNode {
  data: {
    id: string
    label: string
    type: string
    [key: string]: any
  }
}

interface GraphEdge {
  data: {
    source: string
    target: string
    relationship: string
    [key: string]: any
  }
}

interface GraphVisualizationProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (nodeId: string, nodeData: any) => void
  interactive?: boolean
}

export default function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  interactive = true
}: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: nodes.map(n => ({
          data: n.data,
          classes: n.data.type.toLowerCase()
        })),
        edges: edges.map(e => ({
          data: e.data
        }))
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#6366f1',
            'label': 'data(label)',
            'font-size': '12px',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#f1f5f9',
            'text-outline-color': '#0f172a',
            'text-outline-width': 2,
            'width': 60,
            'height': 60,
            'transition-property': 'background-color, width, height',
            'transition-duration': 300
          }
        },
        {
          selector: 'node.user',
          style: {
            'background-color': '#8b5cf6',
            'shape': 'ellipse',
            'width': 80,
            'height': 80,
            'border-width': 3,
            'border-color': '#a78bfa'
          }
        },
        {
          selector: 'node.project',
          style: {
            'background-color': '#3b82f6',
            'shape': 'roundrectangle',
            'width': 70,
            'height': 70
          }
        },
        {
          selector: 'node.skill',
          style: {
            'background-color': '#10b981',
            'shape': 'diamond',
            'width': 50,
            'height': 50
          }
        },
        {
          selector: 'node.organization',
          style: {
            'background-color': '#f59e0b',
            'shape': 'hexagon',
            'width': 65,
            'height': 65
          }
        },
        {
          selector: 'node.education',
          style: {
            'background-color': '#06b6d4',
            'shape': 'pentagon',
            'width': 60,
            'height': 60
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#fff',
            'width': 80,
            'height': 80
          }
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 3,
            'border-color': '#fbbf24'
          }
        },
        {
          selector: 'node.faded',
          style: {
            'opacity': 0.3
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
            'opacity': 0.6,
            'transition-property': 'line-color, opacity',
            'transition-duration': 300
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#fbbf24',
            'target-arrow-color': '#fbbf24',
            'width': 3,
            'opacity': 1
          }
        },
        {
          selector: 'edge.faded',
          style: {
            'opacity': 0.1
          }
        }
      ],
      layout: {
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        randomize: true
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2
    })

    cyRef.current = cy

    // Event handlers
    if (interactive) {
      cy.on('tap', 'node', (evt) => {
        const node = evt.target
        const nodeData = node.data()
        setSelectedNode(nodeData)
        
        if (onNodeClick) {
          onNodeClick(nodeData.id, nodeData)
        }

        // Highlight connected nodes
        cy.elements().removeClass('highlighted faded')
        
        const connectedEdges = node.connectedEdges()
        const connectedNodes = connectedEdges.connectedNodes()
        
        cy.elements().not(node).not(connectedNodes).not(connectedEdges).addClass('faded')
        connectedEdges.addClass('highlighted')
        connectedNodes.addClass('highlighted')
      })

      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          cy.elements().removeClass('highlighted faded')
          setSelectedNode(null)
        }
      })

      // Hover effects
      cy.on('mouseover', 'node', (evt) => {
        const node = evt.target
        if (!node.hasClass('faded')) {
          document.body.style.cursor = 'pointer'
        }
      })

      cy.on('mouseout', 'node', () => {
        document.body.style.cursor = 'default'
      })
    }

    return () => {
      cy.destroy()
    }
  }, [nodes, edges, interactive, onNodeClick])

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2)
      cyRef.current.center()
    }
  }

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8)
      cyRef.current.center()
    }
  }

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50)
    }
  }

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('highlighted faded')
      cyRef.current.layout({
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 1000,
        randomize: true
      } as any).run()
      setSelectedNode(null)
    }
  }

  return (
    <div className="relative w-full h-full">
      <motion.div
        ref={containerRef}
        className="w-full h-full rounded-xl bg-slate-950 border border-slate-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Controls */}
      {interactive && (
        <motion.div
          className="absolute bottom-4 right-4 flex flex-col gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            size="icon"
            variant="secondary"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={handleFit}
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={handleReset}
            title="Reset Layout"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Node Info Tooltip */}
      {selectedNode && (
        <motion.div
          className="absolute top-4 left-4 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl max-w-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-100">
              {selectedNode.label}
            </h3>
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
              {selectedNode.type}
            </span>
          </div>
          {selectedNode.description && (
            <p className="text-sm text-slate-400 mb-2">{selectedNode.description}</p>
          )}
          {selectedNode.stars !== undefined && (
            <div className="text-sm text-slate-400">
              ⭐ {selectedNode.stars} stars
            </div>
          )}
          {selectedNode.url && (
            <a
              href={selectedNode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline"
            >
              View Project →
            </a>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400 text-lg mb-2">No graph data yet</p>
            <p className="text-slate-500 text-sm">
              Add projects, skills, or experience to see your graph
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
