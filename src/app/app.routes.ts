import { Routes } from '@angular/router';
import { ImageAnnotateComponent } from './image-annotate/image-annotate.component';

export const routes: Routes = [
    { path: '', redirectTo: 'image-annotate', pathMatch: 'full' },
    { path: 'image-annotate', component: ImageAnnotateComponent }
];
