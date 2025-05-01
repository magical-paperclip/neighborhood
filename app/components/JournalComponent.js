import React, { useState, useRef, useEffect } from 'react';
import { getToken } from "@/utils/storage";

const DRAG_THRESHOLD = 4; // px before drag starts
const RESIZE_HOTZONE = 4; // px

// function getApiBase() {
//   return window.location.hostname === 'localhost'
//     ? 'http://localhost:3001/api'
//     : 'https://neighborhood.hackclub.com/api';
// }

function getApiBase() {
  return window.location.hostname === 'localhost'
    ? 'https://neighborhood.hackclub.com/api'
    : 'https://neighborhood.hackclub.com/api';
}


const JournalComponent = ({ isExiting, onClose, token }) => {
  const [pageNumber, setPageNumber] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState('cursor');
  const [textBoxes, setTextBoxes] = useState([]);
  const [isCreatingTextBox, setIsCreatingTextBox] = useState(false);
  const [currentTextBox, setCurrentTextBox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [hoverResizeDirection, setHoverResizeDirection] = useState(null);
  const [penStrokes, setPenStrokes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const canvasRef = useRef(null);
  const pageRef = useRef(null);
  const containerRef = useRef(null);
  const lastSerializedState = useRef(null);
  const [pageID, setPageID] = useState(null);
  
  // Base canvas dimensions (virtual coordinate system)
  const BASE_WIDTH = 1000;
  const BASE_HEIGHT = 700;
  const BASE_FONT_SIZE = 48; // Increased from 32 to 48
  const PAGE_NUMBER_SIZE = 36; // Larger page number size
  const HANDLE_SIZE = 10; // Size of resize handles
  
  // Icon categories
  const cursorModes = [
    { name: 'cursor', icon: '/journalIcons/cursor.svg' },
    { name: 'text', icon: '/journalIcons/text.svg' },
    { name: 'draw', icon: '/journalIcons/draw.svg' }
  ];
  const attachments = [
    { name: 'github', icon: '/journalIcons/githubIcons.svg' },
    { name: 'photo', icon: '/journalIcons/photo.svg' },
    { name: 'stopwatch', icon: '/journalIcons/stopwatch.svg' }
  ];
  const pageControls = [
    { name: 'back', icon: '/journalIcons/back.svg' },
    { name: 'next', icon: '/journalIcons/next.svg' }
  ];

  // Calculate scale factor whenever container size changes
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const widthScale = containerRect.width / BASE_WIDTH;
        const heightScale = containerRect.height / BASE_HEIGHT;
        
        // Use the smaller scale to ensure content fits
        const newScale = Math.min(widthScale, heightScale);
        setScale(newScale);
      }
    };

    // Initial scale calculation
    updateScale();
    
    // Recalculate on window resize
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [pageNumber]); // Recalculate when page changes

  // Handle keyboard events (delete)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId && !isCreatingTextBox) {
        // Try to delete a text box
        setTextBoxes(prev => prev.filter(box => box.id !== selectedBoxId));
        // Try to delete a pen stroke
        setPenStrokes(prev => prev.filter(stroke => stroke.id !== selectedBoxId));
        setSelectedBoxId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoxId, isCreatingTextBox]);

  // Ensure dragging/resizing always ends on mouseup anywhere
  useEffect(() => {
    const handleWindowMouseUp = () => {
      setIsDraggingElement(false);
      setIsResizing(false);
      setResizeDirection(null);
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  useEffect(() => {
    if (isDraggingElement) {
      const prev = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.userSelect = prev;
      };
    }
  }, [isDraggingElement]);

  useEffect(() => {
    if (selectedIcon !== 'cursor') {
      setSelectedBoxId(null);
    }
  }, [selectedIcon]);

  const divider = (
    <div style={{ height: 1, background: '#4C2D10', width: '70%', margin: '8px 0', borderRadius: 1 }} />
  );

  // Convert screen coordinates to virtual coordinates
  const screenToVirtual = (screenX, screenY) => {
    if (!pageRef.current) return { x: 0, y: 0 };
    
    const rect = pageRef.current.getBoundingClientRect();
    const x = (screenX - rect.left) / scale;
    const y = (screenY - rect.top) / scale;
    
    return { x, y };
  };

  // Convert virtual coordinates to screen coordinates
  const virtualToScreen = (virtualX, virtualY) => {
    return {
      x: virtualX * scale,
      y: virtualY * scale
    };
  };

  // Check if coordinates are within the canvas bounds
  const isWithinCanvasBounds = (x, y) => {
    // For page 1, allow writing anywhere on the page
    return true;
  };

  // Helper to get resize direction if near a border/corner
  function getResizeDirection(mouseX, mouseY, box) {
    const boxWidth = box.width === 'auto' ? 200 : box.width;
    const boxHeight = box.height === 'auto' ? 100 : box.height;
    const left = box.x * scale;
    const top = box.y * scale;
    const right = left + boxWidth * scale;
    const bottom = top + boxHeight * scale;
    const x = mouseX;
    const y = mouseY;
    let vertical = '';
    let horizontal = '';
    if (Math.abs(y - top) <= RESIZE_HOTZONE) vertical = 'n';
    if (Math.abs(y - bottom) <= RESIZE_HOTZONE) vertical = 's';
    if (Math.abs(x - left) <= RESIZE_HOTZONE) horizontal = 'w';
    if (Math.abs(x - right) <= RESIZE_HOTZONE) horizontal = horizontal ? horizontal + 'e' : 'e';
    if (vertical && horizontal) return vertical + horizontal;
    if (vertical) return vertical;
    if (horizontal) return horizontal;
    return null;
  }

  // Enhanced mouse move for hot zone detection
  const handleCanvasMouseMove = (e) => {
    if (isDragging && selectedIcon === 'text') {
      const { x, y } = screenToVirtual(e.clientX, e.clientY);
      setDragCurrent({ x, y });
    } else if (isDraggingElement && selectedBoxId && selectedIcon === 'cursor') {
      const { x, y } = screenToVirtual(e.clientX, e.clientY);
      setTextBoxes(prev => prev.map(box => {
        if (box.id === selectedBoxId) {
          return {
            ...box,
            x: x - dragOffset.x,
            y: y - dragOffset.y
          };
        }
        return box;
      }));
      setHoverResizeDirection(null);
    } else if (isResizing && selectedBoxId && selectedIcon === 'cursor') {
      const { x, y } = screenToVirtual(e.clientX, e.clientY);
      const box = textBoxes.find(b => b.id === selectedBoxId);
      if (box) {
        const currentWidth = box.width === 'auto' ? 200 : box.width;
        const currentHeight = box.height === 'auto' ? 100 : box.height;
        let newX = box.x;
        let newY = box.y;
        let newWidth = currentWidth;
        let newHeight = currentHeight;
        switch (resizeDirection) {
          case 'n': newY = y; newHeight = box.y + currentHeight - y; break;
          case 's': newHeight = y - box.y; break;
          case 'e': newWidth = x - box.x; break;
          case 'w': newX = x; newWidth = box.x + currentWidth - x; break;
          case 'ne': newY = y; newHeight = box.y + currentHeight - y; newWidth = x - box.x; break;
          case 'nw': newY = y; newHeight = box.y + currentHeight - y; newX = x; newWidth = box.x + currentWidth - x; break;
          case 'se': newWidth = x - box.x; newHeight = y - box.y; break;
          case 'sw': newX = x; newWidth = box.x + currentWidth - x; newHeight = y - box.y; break;
        }
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(30, newHeight);
        setTextBoxes(prev => prev.map(b => {
          if (b.id === selectedBoxId) {
            return { ...b, x: newX, y: newY, width: newWidth, height: newHeight, isAutoSize: false };
          }
          return b;
        }));
      }
      setHoverResizeDirection(null);
    } else if (selectedIcon === 'cursor' && selectedBoxId && !isDraggingElement && !isResizing) {
      // Only show resize cursor if not dragging or resizing
      const mouseX = e.nativeEvent.offsetX;
      const mouseY = e.nativeEvent.offsetY;
      const box = textBoxes.find(b => b.id === selectedBoxId);
      if (box) {
        const dir = getResizeDirection(mouseX, mouseY, box);
        setHoverResizeDirection(dir);
      } else {
        setHoverResizeDirection(null);
      }
    } else {
      setHoverResizeDirection(null);
    }
  };

  // Enhanced mousedown for hot zone resizing
  const handleCanvasMouseDown = (e) => {
    if (selectedIcon === 'text') {
      const { x, y } = screenToVirtual(e.clientX, e.clientY);
      if (isWithinCanvasBounds(x, y)) {
        setIsDragging(true);
        setDragStart({ x, y });
        setDragCurrent({ x, y });
      }
    } else if (selectedIcon === 'cursor') {
      // Check if near a border/corner of selected box
      const mouseX = e.nativeEvent.offsetX;
      const mouseY = e.nativeEvent.offsetY;
      const box = textBoxes.find(b => b.id === selectedBoxId);
      if (box) {
        const dir = getResizeDirection(mouseX, mouseY, box);
        if (dir) {
          setIsResizing(true);
          setResizeDirection(dir);
          setIsDraggingElement(false);
          return;
        }
      }
      // Deselect if clicking on empty canvas
      setSelectedBoxId(null);
    }
  };

  const handleCanvasMouseUp = (e) => {
    if (selectedIcon === 'text' && isDragging) {
      const { x: endX, y: endY } = screenToVirtual(e.clientX, e.clientY);
      const width = Math.abs(endX - dragStart.x);
      const height = Math.abs(endY - dragStart.y);
      const x = Math.min(dragStart.x, endX);
      const y = Math.min(dragStart.y, endY);
      if (isWithinCanvasBounds(dragStart.x, dragStart.y)) {
        const isClick = width < 5 && height < 5;
        const newTextBox = {
          id: Date.now(),
          x,
          y,
          width: isClick ? 450 : width,
          height: isClick ? 300 : height,
          content: '',
          pageNumber,
          rotation: 0,
          isAutoSize: false,
          fontSize: BASE_FONT_SIZE
        };
        setTextBoxes(prev => [...prev, newTextBox]);
        setCurrentTextBox(newTextBox);
        setIsCreatingTextBox(true);
        setSelectedIcon('cursor');
      }
      setIsDragging(false);
    }
    // Do not set isDraggingElement or isResizing here; window mouseup handles it
  };

  const handleElementMouseDown = (e, boxId) => {
    e.stopPropagation();
    if (selectedIcon === 'cursor' && !isResizing) {
      setSelectedBoxId(boxId);
      // Start dragging immediately
      const { x, y } = screenToVirtual(e.clientX, e.clientY);
      const box = textBoxes.find(b => b.id === boxId);
      if (box) {
        setDragOffset({ x: x - box.x, y: y - box.y });
        setIsDraggingElement(true);
      }
    }
  };

  const handleResizeHandleMouseDown = (e, direction, boxId) => {
    e.stopPropagation();
    
    if (selectedIcon === 'cursor') {
      setSelectedBoxId(boxId);
      setIsResizing(true);
      setResizeDirection(direction);
      setIsDraggingElement(false);
    }
  };

  const handleTextBoxChange = (id, content) => {
    setTextBoxes(prev => 
      prev.map(box => 
        box.id === id ? { ...box, content } : box
      )
    );
  };

  const handleTextBoxBlur = () => {
    setTextBoxes(prev => 
      prev.map(box => {
        // Remove empty text boxes
        if (box.id === currentTextBox?.id && !box.content.trim()) {
          return null;
        }
        return box;
      }).filter(Boolean)
    );
    
    setIsCreatingTextBox(false);
    setCurrentTextBox(null);
  };

  const handleCanvasClick = (e) => {
    // For touch devices or quick clicks, this will be handled in mouseup
  };

  // Calculate preview rectangle dimensions
  const getPreviewRect = () => {
    if (!isDragging) return null;
    
    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragCurrent.x - dragStart.x);
    const height = Math.abs(dragCurrent.y - dragStart.y);
    
    return { x, y, width, height };
  };

  const previewRect = getPreviewRect();

  // Render resize handles for selected box
  const renderResizeHandles = (box) => {
    if (selectedBoxId !== box.id || selectedIcon !== 'cursor' || isCreatingTextBox) return null;
    const boxWidth = box.width === 'auto' ? 200 : box.width;
    const boxHeight = box.height === 'auto' ? 100 : box.height;
    const handles = [
      { position: 'n', left: boxWidth / 2, top: 0, cursor: 'ns-resize' },
      { position: 's', left: boxWidth / 2, top: boxHeight, cursor: 'ns-resize' },
      { position: 'e', left: boxWidth, top: boxHeight / 2, cursor: 'ew-resize' },
      { position: 'w', left: 0, top: boxHeight / 2, cursor: 'ew-resize' },
      { position: 'ne', left: boxWidth, top: 0, cursor: 'nesw-resize' },
      { position: 'nw', left: 0, top: 0, cursor: 'nwse-resize' },
      { position: 'se', left: boxWidth, top: boxHeight, cursor: 'nwse-resize' },
      { position: 'sw', left: 0, top: boxHeight, cursor: 'nesw-resize' }
    ];
    return handles.map(handle => (
      <div
        key={handle.position}
        onMouseDown={(e) => handleResizeHandleMouseDown(e, handle.position, box.id)}
        style={{
          position: 'absolute',
          left: (handle.left - HANDLE_SIZE / 2) * scale,
          top: (handle.top - HANDLE_SIZE / 2) * scale,
          width: HANDLE_SIZE * scale,
          height: HANDLE_SIZE * scale,
          backgroundColor: '#0095ff',
          border: '1px solid white',
          borderRadius: '50%',
          cursor: handle.cursor,
          zIndex: 5
        }}
      />
    ));
  };

  // Set cursor style on the canvas wrapper
  const getCanvasCursor = () => {
    if (isResizing && resizeDirection) {
      switch (resizeDirection) {
        case 'n': case 's': return 'ns-resize';
        case 'e': case 'w': return 'ew-resize';
        case 'ne': case 'sw': return 'nesw-resize';
        case 'nw': case 'se': return 'nwse-resize';
        default: return 'default';
      }
    }
    if (hoverResizeDirection) {
      switch (hoverResizeDirection) {
        case 'n': case 's': return 'ns-resize';
        case 'e': case 'w': return 'ew-resize';
        case 'ne': case 'sw': return 'nesw-resize';
        case 'nw': case 'se': return 'nwse-resize';
        default: return 'default';
      }
    }
    return selectedIcon === 'cursor' ? 'default' : 'text';
  };

  // Drawing logic
  const handleDrawMouseDown = (e) => {
    if (selectedIcon === 'draw') {
      const { x, y } = screenToVirtual(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentStroke({
        id: Date.now(),
        points: [{ x, y }],
        color: '#000',
        pageNumber,
      });
    }
  };

  const handleDrawMouseMove = (e) => {
    if (isDrawing && selectedIcon === 'draw' && currentStroke) {
      const { x, y } = screenToVirtual(e.clientX, e.clientY);
      setCurrentStroke((prev) => ({
        ...prev,
        points: [...prev.points, { x, y }],
      }));
    }
  };

  const handleDrawMouseUp = (e) => {
    if (isDrawing && selectedIcon === 'draw' && currentStroke && currentStroke.points.length > 1) {
      // Compute bounding box for selection
      const xs = currentStroke.points.map(p => p.x);
      const ys = currentStroke.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      setPenStrokes(prev => [
        ...prev,
        {
          ...currentStroke,
          bbox: { minX, minY, maxX, maxY },
        },
      ]);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  // Serialize the current state into a JSON string
  const serializeState = () => {
    const state = {
      textBoxes,
      penStrokes,
      pageNumber
    };
    return JSON.stringify(state);
  };

  // Deserialize a JSON string back into state
  const deserializeState = (serializedState) => {
    try {
      const state = JSON.parse(serializedState);
      setTextBoxes(state.textBoxes);
      setPenStrokes(state.penStrokes);
      setPageNumber(state.pageNumber);
    } catch (error) {
      console.error('Failed to deserialize state:', error);
    }
  };

  // Log state changes and store in ref
  useEffect(() => {
    const serializedState = serializeState();
    lastSerializedState.current = serializedState;
    console.log('Current canvas state:', serializedState);
  }, [textBoxes, penStrokes, pageNumber]);

  // Handle Journal text click
  const handleJournalClick = () => {
    if (lastSerializedState.current) {
      // Save the current state to restore after clearing
      const stateToRestore = lastSerializedState.current;

      // Clear all relevant state
      setTextBoxes([]);
      setPenStrokes([]);
      setSelectedBoxId(null);
      setCurrentTextBox(null);
      setIsCreatingTextBox(false);
      setIsDragging(false);
      setIsDraggingElement(false);
      setIsResizing(false);
      setResizeDirection(null);
      setHoverResizeDirection(null);
      setIsDrawing(false);
      setCurrentStroke(null);

      // Wait for state to clear, then restore from the saved state
      setTimeout(() => {
        deserializeState(stateToRestore);
        console.log("Restored from:", stateToRestore);
      }, 5000);
    }
  };

  // Track last saved state to avoid unnecessary saves
  const lastSavedState = useRef(null);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const serialized = serializeState();
      if (serialized !== lastSavedState.current) {
        fetch(`${getApiBase()}/editJournalPage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            pageNumber,
            pageID,
            serializedJournalEntry: serialized,
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.pageID) setPageID(data.pageID);
            lastSavedState.current = serialized;
          })
          .catch(err => {
            console.error('Failed to save journal page:', err);
          });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [textBoxes, penStrokes]);

  // On mount, fetch all journal pages for this user
  useEffect(() => {
    if (!token) return;
    fetch(`${getApiBase()}/getJournalPages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.pages && data.pages.length > 0) {
          // For now, just load the first page (PageID 1)
          const page = data.pages.find(p => p.pageNumber === 1);
          if (page && page.serializedJournalEntry) {
            setPageID(page.id || page.PageID); // Airtable record id or PageID field
            setPageNumber(page.pageNumber);
            deserializeState(page.serializedJournalEntry);
          } else {
            // If no page found, generate a new PageID
            setPageID(generatePageID());
            setPageNumber(1);
          }
        } else {
          // No pages found, generate a new PageID
          setPageID(generatePageID());
          setPageNumber(1);
        }
      })
      .catch(err => {
        console.error('Failed to fetch journal pages:', err);
      });
  }, [token]);

  const generatePageID = () => Math.random().toString(36).substr(2, 10);

  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""}`} 
      style={{
        position: "absolute", 
        zIndex: 2, 
        width: "calc(100% - 16px)", 
        height: "calc(100% - 16px)", 
        borderRadius: 8, 
        marginLeft: 8, 
        marginTop: 8, 
        backgroundColor: "#FFF9E6",
        overflow: "hidden"
      }}
    >
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "1px solid #00000010",
        backgroundColor: "#FFF9E6"
      }}>
        <div 
          onClick={onClose} 
          style={{
            width: 14, 
            cursor: "pointer", 
            height: 14, 
            borderRadius: 16, 
            backgroundColor: "#FF5F56"
          }}
        />
        <p 
          onClick={handleJournalClick}
          style={{
            fontSize: 18, 
            color: "#000", 
            margin: 0,
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          Journal
        </p>
        <div style={{width: 14, height: 14}} />
      </div>
      
      <div style={{
        width: "100%",
        height: "calc(100% - 44px)", 
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative"
      }}>
        <div style={{width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
        {pageNumber == 0 && 
        <div 
        onClick={() => setPageNumber(1)}

        style={{
          width: "45%",
          maxHeight: "calc(100% - 16px)",
          borderRadius: "4px 16px 16px 4px",
          aspectRatio: "0.7071428571", // A5 portrait aspect ratio (148mm/210mm)
          margin: "0 auto",
          backgroundColor: "#4C2D11",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 16
        }}>
          <div style={{width: "100%", height: "100%", display: "flex", border: "1px dashed #8B4513", borderRadius: "2px 8px 8px 2px", alignItems: "center", justifyContent: "center", backgroundColor: "#4C2D11"}}>
          <img style={{width: "50%" }}src="./Neighborhood2Color.png"/>

          </div>
        </div>}

        {pageNumber == 1 &&
        <div style={{
          width: "90%",
          maxHeight: "calc(100% - 16px)",
          aspectRatio: 1.4095238095,
          backgroundColor: "#4C2D11",
          borderRadius: "8px", 
          padding: 3, gap: 0.5,
          display: "flex",
          flexDirection: "row"
        }}>
          <div 
            ref={containerRef}
            style={{
              width: "100%", 
              height: "100%", 
              borderRadius: "4px 2px 2px 4px", 
              backgroundColor: "#fff", 
              position: "relative",
              cursor: selectedIcon === 'text' ? 'text' : 'default',
              overflow: "hidden"
            }}
          >
            {/* Canvas wrapper that captures events */}
            <div 
              ref={pageRef}
              onClick={handleCanvasClick}
              onMouseDown={e => {
                if (selectedIcon === 'draw') handleDrawMouseDown(e);
                else handleCanvasMouseDown(e);
              }}
              onMouseMove={e => {
                if (selectedIcon === 'draw') handleDrawMouseMove(e);
                else handleCanvasMouseMove(e);
              }}
              onMouseUp={e => {
                if (selectedIcon === 'draw') handleDrawMouseUp(e);
                else handleCanvasMouseUp(e);
              }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 2,
                cursor: getCanvasCursor(),
              }} 
            />
            
            {/* SVG pen strokes (inside canvas, below text boxes) */}
            <svg
              width={BASE_WIDTH * scale}
              height={BASE_HEIGHT * 2 * scale}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 3 }}
            >
              {penStrokes.filter(s => s.pageNumber === pageNumber).map(stroke => (
                <path
                  key={stroke.id}
                  d={
                    stroke.points.reduce(
                      (acc, p, i) =>
                        acc + (i === 0 ? `M${p.x * scale},${p.y * scale}` : `L${p.x * scale},${p.y * scale}`),
                      ''
                    )
                  }
                  stroke={stroke.color}
                  strokeWidth={15 * scale}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    cursor: selectedIcon === 'cursor' ? 'pointer' : 'crosshair',
                    pointerEvents: selectedIcon === 'cursor' ? 'auto' : 'none',
                    opacity: selectedBoxId === stroke.id ? 0.7 : 1,
                  }}
                  onClick={e => {
                    if (selectedIcon === 'cursor') {
                      e.stopPropagation();
                      setSelectedBoxId(stroke.id);
                    }
                  }}
                />
              ))}
              {/* Current stroke preview */}
              {isDrawing && currentStroke && (
                <path
                  d={
                    currentStroke.points.reduce(
                      (acc, p, i) =>
                        acc + (i === 0 ? `M${p.x * scale},${p.y * scale}` : `L${p.x * scale},${p.y * scale}`),
                      ''
                    )
                  }
                  stroke={currentStroke.color}
                  strokeWidth={15 * scale}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </svg>
            
            {/* Virtual canvas with fixed coordinate system */}
            <div 
              ref={canvasRef}
              style={{
                width: BASE_WIDTH,
                height: BASE_HEIGHT,
                position: "absolute",
                top: 0,
                left: 0,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                zIndex: 1
              }} 
            />
            
            {isDragging && selectedIcon === 'text' && previewRect && isWithinCanvasBounds(dragStart.x, dragStart.y) && (
              <div
                style={{
                  position: 'absolute',
                  left: previewRect.x * scale,
                  top: previewRect.y * scale,
                  width: previewRect.width * scale,
                  height: previewRect.height * scale,
                  border: '1px dashed #0095ff',
                  backgroundColor: 'rgba(0, 149, 255, 0.1)',
                  pointerEvents: 'none',
                  zIndex: 3
                }}
              />
            )}
            {textBoxes
              .filter(box => box.pageNumber === pageNumber)
              .map(box => (
                <div key={box.id} style={{ position: 'absolute', width: box.isAutoSize ? 'auto' : `${box.width * scale}px`, height: box.isAutoSize ? 'auto' : `${box.height * scale}px`, left: box.x * scale, top: box.y * scale, zIndex: 4 }}>
                  <div
                    onMouseDown={(e) => handleElementMouseDown(e, box.id)}
                    onDoubleClick={() => {
                      setCurrentTextBox(box);
                      setIsCreatingTextBox(true);
                    }}
                    onClick={(e) => {
                      if (selectedIcon === 'text') {
                        e.stopPropagation();
                        setCurrentTextBox(box);
                        setIsCreatingTextBox(true);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      border: (selectedBoxId === box.id || currentTextBox?.id === box.id) ? '1px solid #0095ff' : (selectedIcon === 'cursor' ? '1px solid transparent' : '1px solid transparent'),
                      borderRadius: '2px',
                      padding: 0,
                      margin: 0,
                      outline: 'none',
                      boxShadow: 'none',
                      cursor: selectedIcon === 'cursor' ? (isResizing ? 'default' : 'move') : 'text',
                      whiteSpace: box.isAutoSize ? 'pre-wrap' : undefined,
                      wordBreak: 'break-word',
                      fontSize: `${box.fontSize * scale}px`,
                      lineHeight: '1.5',
                      fontWeight: '400',
                      boxSizing: 'border-box',
                      userSelect: 'none',
                      background: selectedBoxId === box.id ? 'rgba(0,149,255,0.03)' : 'none',
                      color: 'inherit',
                    }}
                  >
                    {currentTextBox?.id === box.id ? (
                      <textarea
                        autoFocus
                        value={box.content}
                        onChange={(e) => handleTextBoxChange(box.id, e.target.value)}
                        onBlur={handleTextBoxBlur}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          backgroundColor: 'transparent',
                          overflow: 'hidden',
                          cursor: 'text',
                          userSelect: 'text',
                          boxSizing: 'border-box',
                          padding: 0,
                          margin: 0,
                          fontWeight: 'inherit',
                          color: 'inherit',
                          boxShadow: 'none',
                        }}
                      />
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedIcon === 'cursor') {
                            setSelectedBoxId(box.id);
                          } else if (selectedIcon === 'text') {
                            setCurrentTextBox(box);
                            setIsCreatingTextBox(true);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          pointerEvents: 'none',
                          boxSizing: 'border-box',
                          padding: 0,
                          margin: 0,
                          fontWeight: 'inherit',
                          color: 'inherit',
                          background: 'transparent',
                          userSelect: 'none',
                          cursor: 'inherit',
                        }}
                      >
                        {box.content}
                      </div>
                    )}
                  </div>
                  {renderResizeHandles(box)}
                </div>
              ))}
            <div style={{
              position: "absolute", 
              bottom: 16 * scale, 
              left: 16 * scale, 
              fontSize: `${PAGE_NUMBER_SIZE * scale}px`, 
              color: "#444",
              zIndex: 2,
              fontWeight: '500'
            }}>1</div>
          </div>
          <div style={{width: "100%", height: "100%", borderRadius: "2px 4px 4px 2px", backgroundColor: "#fff", position: "relative"}}>
            <canvas style={{width: "100%", height: "100%"}} />
            <div style={{
              position: "absolute", 
              bottom: 16 * scale, 
              right: 16 * scale, 
              fontSize: `${PAGE_NUMBER_SIZE * scale}px`, 
              color: "#444",
              zIndex: 2,
              fontWeight: '500'
            }}>2</div>
          </div>
        </div>
        }
        </div>
        <div style={{height: "100%", gap: 8, alignItems: "center", paddingTop: 8, display: 'flex', flexDirection: "column", borderLeft: "1px solid #4C2D10", backgroundColor: "#FCEA64", width: 64}}>
          {cursorModes.map(({ name, icon }) => (
            <div
              key={name}
              onClick={() => setSelectedIcon(name)}
              style={{
                width: 42,
                borderRadius: 8,
                height: 42,
                border: "1px solid #4C2D10",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 1,
                background: selectedIcon === name ? '#000' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
            >
              <img
                src={icon}
                alt={name}
                style={{
                  width: '70%',
                  height: '70%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  filter: selectedIcon === name ? 'invert(1)' : 'none',
                  pointerEvents: 'none'
                }}
                draggable={false}
              />
            </div>
          ))}
          {divider}
          {attachments.map(({ name, icon }) => (
            <div
              key={name}
              onClick={() => setSelectedIcon(name)}
              style={{
                width: 42,
                borderRadius: 8,
                height: 42,
                border: "1px solid #4C2D10",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 1,
                background: selectedIcon === name ? '#000' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
            >
              <img
                src={icon}
                alt={name}
                style={{
                  width: '70%',
                  height: '70%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  filter: selectedIcon === name ? 'invert(1)' : 'none',
                  pointerEvents: 'none'
                }}
                draggable={false}
              />
            </div>
          ))}
          {divider}
          {pageControls.map(({ name, icon }) => (
            <div
              key={name}
              onClick={() => setSelectedIcon(name)}
              style={{
                width: 42,
                borderRadius: 8,
                height: 42,
                border: "1px solid #4C2D10",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 1,
                background: selectedIcon === name ? '#000' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
            >
              <img
                src={icon}
                alt={name}
                style={{
                  width: '70%',
                  height: '70%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  filter: selectedIcon === name ? 'invert(1)' : 'none',
                  pointerEvents: 'none'
                }}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JournalComponent; 