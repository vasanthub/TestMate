import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

interface TreeNode {
  key: string | number;
  value: any;
  type: string;
  isArray: boolean;
  isObject: boolean;
  isExpanded: boolean;
  children?: TreeNode[];
  originalIndex?: number | null;
}

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './json-viewer.component.html',
  styleUrls: ['./json-viewer.component.css']
})
export class JsonViewerComponent implements OnInit {
  jsonData: any = null;
  searchTerm: string = '';
  currentFile: File | null = null;
  fileName: string = '';
  isInputCollapsed: boolean = false;
  jsonInputText: string = '[]';
  treeData: TreeNode[] = [];
  showRefreshButton: boolean = false;

  domain: string| null = '';
  topic: string| null = '';
  repository: string| null = '';


  constructor(
      private dataService: DataService
    ) {}
  

  ngOnInit(): void {
    this.domain=localStorage.getItem("selectedDomain");
    this.topic=localStorage.getItem("selectedTopic");
    this.repository=localStorage.getItem("selectedrepository");
   
    this.loadQuestions();    
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    console.log(file);
    if (file) {
      this.currentFile = file;
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const content = e.target.result;
        this.jsonInputText = content;
        
        this.fileName = `Loaded: ${file.name}`;
        
        this.showRefreshButton = true;
        
        try {
          this.jsonData = JSON.parse(content);
          this.renderJSON();
          this.isInputCollapsed = true;
        } catch (err: any) {
          alert('Invalid JSON: ' + err.message);
        }
      };
      
      reader.readAsText(file);
    }
  }

  onRefresh(): void {
    console.log(this.currentFile);
    if (this.currentFile) {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const content = e.target.result;
        this.jsonInputText = content;
        
        //localStorage.setItem('jsonViewerContent', content);
        
        try {
          this.jsonData = JSON.parse(content);
          this.renderJSON();
          const now = new Date().toLocaleTimeString();
          this.fileName = `Refreshed: ${this.currentFile?.name} at ${now}`;
          this.isInputCollapsed = true;
        } catch (err: any) {
          alert('Invalid JSON: ' + err.message);
        }
      };
      
      reader.readAsText(this.currentFile);
    }
  }

  onRender(): void {
    try {
      this.jsonData = JSON.parse(this.jsonInputText);
      this.renderJSON();
      this.isInputCollapsed = true;
    } catch (err: any) {
      alert('Invalid JSON: ' + err.message);
    }
  }

  onClear(): void {
    this.jsonInputText = '';
    this.jsonData = null;
    this.treeData = [];
    this.fileName = '';
    this.showRefreshButton = false;
    localStorage.removeItem('jsonViewerContent');
    localStorage.removeItem('jsonViewerFileName');
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.renderJSON();
  }

  toggleInput(): void {
    this.isInputCollapsed = !this.isInputCollapsed;
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  loadQuestions(): void {
    if (this.domain && this.topic && this.repository){
      this.dataService.getRepository(this.domain, this.topic, this.repository).subscribe({
            next: (questions) => {              
              this.jsonData=questions;
              this.renderJSON();
              this.isInputCollapsed = true;              
            },
            error: (err) => {
              console.error('Error loading questions:', err);              
            }
          });
    }
  }

  renderJSON(): void {
    if (!this.jsonData) {
      this.treeData = [];
      return;
    }

    let dataToRender = this.jsonData;
    
    if (this.searchTerm) {
      dataToRender = this.filterData(this.jsonData, this.searchTerm);
    }
    
    this.treeData = this.buildTree(dataToRender, 'root', null, !!this.searchTerm);
  }

  filterData(data: any, term: string): any {
    if (Array.isArray(data)) {
      return data.map((item, index) => {
        const filtered = this.filterDataRecursive(item, term);
        if (filtered !== null) {
          if (typeof filtered === 'object' && filtered !== null) {
            return { ...filtered, __originalIndex: index };
          }
        }
        return filtered;
      }).filter(item => item !== null);
    }
    return this.filterDataRecursive(data, term);
  }

  filterDataRecursive(data: any, term: string): any {
    if (data === null || data === undefined) {
      return null;
    }

    const valueStr = String(data).toLowerCase();
    if (valueStr.includes(term)) {
      return data;
    }

    if (Array.isArray(data)) {
      const filtered = data.map(item => this.filterDataRecursive(item, term)).filter(item => item !== null);
      return filtered.length > 0 ? filtered : null;
    }

    if (typeof data === 'object') {
      const filtered: any = {};
      let hasMatch = false;

      for (let key in data) {
        if (key.toLowerCase().includes(term)) {
          filtered[key] = data[key];
          hasMatch = true;
        } else {
          const result = this.filterDataRecursive(data[key], term);
          if (result !== null) {
            filtered[key] = result;
            hasMatch = true;
          }
        }
      }

      return hasMatch ? filtered : null;
    }

    return null;
  }

  buildTree(data: any, key: string | number, originalIndex: number | null, isFiltered: boolean): TreeNode[] {
    if (data === null) {
      return [{
        key,
        value: 'null',
        type: 'null',
        isArray: false,
        isObject: false,
        isExpanded: false,
        originalIndex
      }];
    }

    if (Array.isArray(data)) {
      const node: TreeNode = {
        key,
        value: `[${data.length}]`,
        type: 'array',
        isArray: true,
        isObject: false,
        isExpanded: true,
        originalIndex,
        children: []
      };

      data.forEach((item, index) => {
        const itemOriginalIndex = item && typeof item === 'object' && item.__originalIndex !== undefined
          ? item.__originalIndex
          : (isFiltered ? null : index);

        let displayItem = item;
        if (item && typeof item === 'object' && item.__originalIndex !== undefined) {
          displayItem = { ...item };
          delete displayItem.__originalIndex;
        }

        node.children!.push(...this.buildTree(displayItem, index, itemOriginalIndex, isFiltered));
      });

      return [node];
    }

    if (typeof data === 'object') {
      const node: TreeNode = {
        key,
        value: `{${Object.keys(data).length}}`,
        type: 'object',
        isArray: false,
        isObject: true,
        isExpanded: true,
        originalIndex,
        children: []
      };

      for (let k in data) {
        if (k !== '__originalIndex') {
          node.children!.push(...this.buildTree(data[k], k, null, isFiltered));
        }
      }

      return [node];
    }

    // Primitive values
    let type = typeof data;
    let value = data;

    if (type === 'string') {
      value = `"${data}"`;
    }

    return [{
      key,
      value,
      type,
      isArray: false,
      isObject: false,
      isExpanded: false,
      originalIndex
    }];
  }

  toggleNode(node: TreeNode): void {
    node.isExpanded = !node.isExpanded;
  }

  highlightText(text: string): string {
    if (!this.searchTerm) return text;
    const regex = new RegExp(`(${this.searchTerm})`, 'gi');
    return String(text).replace(regex, '<span class="highlight">$1</span>');
  }

  getValueClass(type: string): string {
    return `value ${type}`;
  }
}
