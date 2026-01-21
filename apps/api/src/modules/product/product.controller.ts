// ============================================
// Product 控制器 - 商品 API
// Costco 模式：智能定價 + 自營物流
// ============================================

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import { CreateProductDto, UpdateProductDto, QueryProductsDto, CalculatePriceDto } from './dto/product.dto';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  // ========================================
  // 公開接口 (前台)
  // ========================================

  // GET /api/products - 商品列表
  @Get()
  async getProducts(@Query() query: QueryProductsDto) {
    return this.productService.getProducts(query);
  }

  // GET /api/products/featured - 推薦商品
  @Get('featured')
  async getFeaturedProducts() {
    return this.productService.getProducts({ featured: true, limit: 10 });
  }

  // GET /api/products/:id - 商品詳情
  @Get(':id')
  async getProductDetail(@Param('id') id: string) {
    return this.productService.getProductDetail(id);
  }

  // ========================================
  // 管理員接口 (後台)
  // ========================================

  // GET /api/products/admin/all - 所有商品
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/all')
  async getAllProducts(@Query() query: QueryProductsDto) {
    return this.productService.getAllProducts(query);
  }

  // POST /api/products/admin/calculate-price - 智能定價計算 (Costco 模式)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/calculate-price')
  async calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.productService.calculateSuggestedPrice(dto);
  }

  // POST /api/products/admin - 創建商品
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin')
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  // PUT /api/products/admin/:id - 更新商品
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('admin/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(id, dto);
  }

  // DELETE /api/products/admin/:id - 刪除商品
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('admin/:id')
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}
