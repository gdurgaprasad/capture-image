import { Component, TemplateRef } from '@angular/core';
import { fabric } from 'fabric';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WebcamImage, WebcamInitError, WebcamModule } from 'ngx-webcam';
import { Observable, Subject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxJsonViewerModule } from 'ngx-json-viewer';

type CanvasShape = 'Circle' | 'Ellipse' | 'Line' | 'Polygon' | 'Polyline' | 'Rectangle' | 'Triangle'
type DownloadCanvasType = 'jpeg' | 'png'
type CanvasJsonType = 'DOWNLOAD JSON' | 'VIEW JSON'

export enum MESSAGES {
  IMAGE_CAPTURE_SUCCESS = 'IMAGE CAPTURED SUCCESSFULLY.'
}

export enum RESULTS {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

@Component({
  selector: 'app-image-annotate',
  templateUrl: './image-annotate.component.html',
  styleUrls: ['./image-annotate.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, WebcamModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    NgxJsonViewerModule]
})
export class ImageAnnotateComponent {
  width: number = 0
  height: number = 0

  /* FABRIC CANVAS ELEMENT */
  canvas!: fabric.Canvas
  /*CAPTURE ERRORS ON WEBCAM INITIALIZATION/USAGE */
  errors: WebcamInitError[] = [];
  /*STORE CAPTURED IMAGE */
  webcamImage: WebcamImage | null = null;
  /* TRIGGER EVENT TO CAPTURE WEBCAM IMAGE */
  trigger: Subject<void> = new Subject<void>();

  canvasShapes: CanvasShape[] = ['Circle', 'Ellipse', 'Line', 'Polygon', 'Polyline', 'Rectangle', 'Triangle']
  downloadCanvasOptions: DownloadCanvasType[] = ['png', 'jpeg']
  jsonOptions: CanvasJsonType[] = ['DOWNLOAD JSON', 'VIEW JSON']

  undoStack: string[] = [];
  redoStack: string[] = [];

  /*USED IN VIEW/DOWNLOAD CANVAS AS JSON */
  canvasJsonObject: Object = {}

  constructor(private matDialog: MatDialog, private snackBar: MatSnackBar) {
    /*REDUCTION IN WIDTH & HEIGHT IS TO SHOW SOME SPACE ON ALL SIDES OF IMAGE */
    this.height = window.innerHeight - 120
    this.width = window.innerWidth - 50
  }

  /* CAPTURE OCCURED ERRORS DURING THE WEB CAM ACCESS/CAPTURE */
  handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
  }

  /* CAPTURE WEBCAM IMAGE */
  handleImage(webcamImage: WebcamImage): void {
    this.webcamImage = webcamImage;
    this.canvas = new fabric.Canvas(document.getElementById('canvas-img') as HTMLCanvasElement, {
    })
    /*CONVERT RECEIVED WEBCAM IMAGE AS DATAURL */
    const imageSrc = webcamImage.imageAsDataUrl
    /* ADD CAPTURED IMAGE TO CANVAS ELEMENT */
    fabric.Image.fromURL(imageSrc, (img) => {
      this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas), {
        scaleX: this.width,
        scaleY: this.canvas.height
      })
    });

    /* WHEN AN OBJECT IS ADDED/MODIFIED IN CANVAS - ADD THOSE TO UNDO STACK */
    this.canvas.on("object:added", (e) => {
      this.saveCanvasState()
    });

    this.canvas.on("object:modified", (e) => {
      this.saveCanvasState()
    });
  }

  get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  triggerSnapshot(): void {
    if (this.errors.length) {
      const errorString = this.errors.map(error => `${error.mediaStreamError.name}[${error.message}]`).join('-->')
      this.snackBar.open(errorString, RESULTS.FAILED, { duration: 5000 })
    } else {
      this.trigger.next();
      this.snackBar.open(MESSAGES.IMAGE_CAPTURE_SUCCESS, RESULTS.SUCCESS, { duration: 2000 })
    }
  }

  /* WHEN USER SELECTS ANY SHAPE - PREDEFINED LOGICS FOR EACH SHAPE IS CONFIGURED */
  onCanvasShapeClick(selectedShape: CanvasShape): void {
    this.canvas.isDrawingMode = false
    switch (selectedShape) {
      case 'Circle': {
        const circle = new fabric.Circle({
          radius: 20, fill: 'white', left: 10, top: 10
        });
        this.canvas.add(circle);
        break
      }
      case 'Ellipse': {
        const ellipse = new fabric.Ellipse({
          rx: 80,
          ry: 40,
          fill: '',
          stroke: 'green',
          strokeWidth: 3
        });
        this.canvas.add(ellipse);
        break
      }
      case 'Line': {
        const line = new fabric.Line([50, 100, 200, 200], {
          left: 150,
          top: 150,
          stroke: 'red'
        });
        this.canvas.add(line);
        break
      }
      case 'Polygon': {
        const points = [
          { x: 30, y: 50 },
          { x: 0, y: 0 },
          { x: 60, y: 0 },
        ];
        const polygon = new fabric.Polygon(points, {
          left: 100,
          top: 40,
          fill: "#1e90ff",
          strokeWidth: 4,
          stroke: "orange",
          flipY: true,
          scaleX: 2,
          scaleY: 2,
        });
        this.canvas.add(polygon);
        break
      }
      case 'Polyline': {
        const polylinePoints = [
          { x: 30, y: 50 },
          { x: 0, y: 0 },
          { x: 60, y: 0 },
        ];
        const polyline = new fabric.Polyline(polylinePoints, {
          left: 100,
          top: 40,
          fill: "white",
          strokeWidth: 4,
          stroke: "green",
        });
        this.canvas.add(polyline);
        break
      }
      case 'Rectangle': {
        const rectangle = new fabric.Rect({
          top: 100,
          left: 100,
          width: 200,
          height: 100,
          fill: '',
          stroke: 'blue',
          strokeWidth: 3
        });
        this.canvas.add(rectangle);
        break
      }
      case 'Triangle': {
        const triangle = new fabric.Triangle({
          left: 55,
          top: 60,
          width: 100,
          height: 70,
          fill: "orange",
        });
        this.canvas.add(triangle);
        break
      }
    }
  }

  /*WHEN PAINT BRUSH SELECTED, ALLOW USER TO USE PENCIL ON CANVAS */
  onDrawingModeSelected(): void {
    this.canvas.isDrawingMode = true
  }

  /* SAVE CURRENT CANAVS STATE TO UNDO STACK */
  saveCanvasState(): void {
    const currentState = JSON.stringify(this.canvas.toDatalessJSON());
    this.undoStack.push(currentState);
  }

  /* UNDO FUNCTION TO DELETE STATES IN CANVAS */
  undo(): void {
    if (this.undoStack.length > 1) {
      const currentState = this.undoStack.pop() as string;
      this.redoStack.push(currentState);

      const previousState = this.undoStack[this.undoStack.length - 1];
      this.loadCanvasState(previousState);
    }
  }

  /* REDO FUNCTION TO ADD DELETED STATES IN CANVAS */
  redo(): void {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop() as string;
      this.undoStack.push(nextState);
      this.loadCanvasState(nextState);
    }
  }

  /*LOAD CANVAS STATE WHEN ANY ACTIONS MADE IN UNDO/REDO */
  loadCanvasState(state: string): void {
    this.canvas.loadFromJSON(state, () => {
      this.canvas.renderAll();
    });
  }

  /*DOWNLOAD CANVAS EITHER AS JPEG/PNG*/
  downloadCanvas(imageType: DownloadCanvasType): void {
    const dataURL = this.canvas.toDataURL({
      width: this.canvas.width,
      height: this.canvas.height,
      left: 0,
      top: 0,
      quality: 1.0,
      format: imageType,
    });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${new Date().getTime()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /*START OF - EXPORT/VIEW JSON UTILITY FUNCTIONS */

  /* SHOW CANVAS AS JSON USING JSON VIEWER */
  openJsonViewerDialog(template: TemplateRef<any>): void {
    this.canvasJsonObject = this.canvas.toObject()
    const dialogRef = this.matDialog.open(template)
    dialogRef.afterClosed().subscribe(() => {
      this.canvasJsonObject = {}
    })
  }

  /*DOWNLOAD CANVAS AS JSON FILE */
  downloadJson(): void {
    this.canvasJsonObject = this.canvas.toObject()
    const jsonString = JSON.stringify(this.canvasJsonObject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${new Date().getTime()}.json`;;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  /*END OF - EXPORT/VIEW JSON UTILITY FUNCTIONS */

  /* CLEAR CANVAS IMAGE */
  clearCanvas(): void {
    this.canvas.dispose()
    this.webcamImage = null
  }
}
